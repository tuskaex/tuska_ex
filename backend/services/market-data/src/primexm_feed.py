"""PrimeXM XCore pricing feed over FIX 4.4 (see "Taker FIX 4.4 Rules of
Engagement").

Session flow:
  Logon (141=Y) → SecurityListRequest → SecurityList (the symbols this taker
  may stream) → one MarketDataRequest per symbol the platform trades
  (263=1 subscribe, 264=1 top of book, incremental) → MassQuote (35=i)
  stream, plus a MarketDataSnapshotFullRefresh (35=W) per symbol every ~5 min.

Every MassQuote / FullRefresh that carries a QuoteID (117) must be answered
with a MassQuoteAcknowledgement (35=b) straight away.

MassQuote entries are deltas: an entry may carry only the ask, only a size,
or a size of -1 (quote cancelled). QuoteBook keeps the last full state per
(symbol, QuoteEntryID) and reports the best bid/ask after each update.

PrimeXM names symbols "EUR/USD"; the platform uses "EURUSD". Slashes are
dropped, and a few names differ outright (ALIASES, extendable with the
PRIMEXM_SYMBOL_ALIASES env var).
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, List, Optional, Set, Tuple

from packages.common.src.fix44 import FixSession, Message, get

logger = logging.getLogger("market-data.primexm")

# PrimeXM name → platform symbol, where stripping "/" isn't enough.
ALIASES: Dict[str, str] = {
    "XTI/USD": "USOIL",
    "XBR/USD": "UKOIL",
    "DE30": "GER40",
    "DE40": "GER40",
}

# No quote at all for this long while the forex market is open means the
# subscription died under a live session (heartbeats still flowing): drop the
# link so the reconnect resubscribes.
DATA_SILENCE_SEC = 300.0
# Older connectors don't answer SecurityListRequest; subscribe by guessed
# names after this long.
SECURITY_LIST_WAIT_SEC = 10.0


def parse_aliases(raw: str) -> Dict[str, str]:
    """"XTI/USD=USOIL, DE30=GER40" → {"XTI/USD": "USOIL", "DE30": "GER40"}."""
    out: Dict[str, str] = {}
    for part in (raw or "").split(","):
        name, sep, plat = part.partition("=")
        if sep and name.strip() and plat.strip():
            out[name.strip().upper()] = plat.strip().upper()
    return out


def to_platform(pxm_symbol: str, aliases: Dict[str, str]) -> str:
    s = pxm_symbol.strip().upper()
    return aliases.get(s) or s.replace("/", "")


def guess_pxm_name(platform_symbol: str, aliases: Dict[str, str]) -> str:
    for pxm, plat in aliases.items():
        if plat == platform_symbol:
            return pxm
    s = platform_symbol.upper()
    return f"{s[:3]}/{s[3:]}" if len(s) == 6 and s.isalpha() else s


@dataclass
class _Entry:
    bid: float = 0.0
    ask: float = 0.0
    bid_size: float = 0.0
    ask_size: float = 0.0


class QuoteBook:
    """Best bid/ask per symbol, rebuilt from MassQuote / FullRefresh deltas."""

    def __init__(self) -> None:
        self._entries: Dict[str, Dict[str, _Entry]] = {}

    def best(self, symbol: str) -> Optional[Tuple[float, float]]:
        entries = self._entries.get(symbol)
        if not entries:
            return None
        bids = [e.bid for e in entries.values() if e.bid > 0 and e.bid_size >= 0]
        asks = [e.ask for e in entries.values() if e.ask > 0 and e.ask_size >= 0]
        if not bids or not asks:
            return None
        return max(bids), min(asks)

    def clear(self) -> None:
        self._entries.clear()

    def apply_mass_quote(self, msg: Message, set_symbol: Callable[[str], Optional[str]]) -> List[str]:
        """Apply a 35=i. `set_symbol` maps QuoteSetID (= our MDReqID) to a
        symbol. Returns the symbols whose state changed."""
        touched: List[str] = []
        symbol: Optional[str] = None
        entry: Optional[_Entry] = None
        for tag, val in msg:
            if tag == "302":
                symbol = set_symbol(val)
                entry = None
                if symbol and symbol not in touched:
                    touched.append(symbol)
            elif tag == "299":
                entry = None
                if symbol:
                    entry = self._entries.setdefault(symbol, {}).setdefault(val, _Entry())
            elif entry is not None:
                if tag == "188":
                    entry.bid = _f(val)
                elif tag == "190":
                    entry.ask = _f(val)
                elif tag == "134":
                    entry.bid_size = _f(val)
                    if entry.bid_size < 0:
                        entry.bid = 0.0  # bid side cancelled
                elif tag == "135":
                    entry.ask_size = _f(val)
                    if entry.ask_size < 0:
                        entry.ask = 0.0  # ask side cancelled
        return touched

    def apply_full_refresh(self, symbol: str, msg: Message) -> None:
        """Apply a 35=W: it replaces the symbol's whole book."""
        fresh: Dict[str, _Entry] = {}
        side: Optional[str] = None
        px = size = 0.0
        entry_id = "0"
        groups: List[Tuple[str, float, float, str]] = []

        def flush() -> None:
            if side is not None:
                groups.append((side, px, size, entry_id))

        for tag, val in msg:
            if tag == "269":
                flush()
                side, px, size, entry_id = val, 0.0, 0.0, "0"
            elif side is not None:
                if tag == "270":
                    px = _f(val)
                elif tag == "271":
                    size = _f(val)
                elif tag == "299":
                    entry_id = val
        flush()
        for s, p, q, eid in groups:
            e = fresh.setdefault(eid, _Entry())
            if s == "0":
                e.bid, e.bid_size = p, q
            elif s == "1":
                e.ask, e.ask_size = p, q
        self._entries[symbol] = fresh


def _f(v: str) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


class PrimeXMFeed:
    """Same get_tick()/start()/stop() surface as InfowayFeed and CorecenLPFeed."""

    def __init__(
        self,
        *,
        host: str,
        port: int,
        sender_comp_id: str,
        target_comp_id: str,
        username: str,
        password: str,
        use_ssl: bool = False,
        heartbeat_sec: int = 30,
        symbols: Callable[[], Iterable[str]],
        extra_aliases: Optional[Dict[str, str]] = None,
    ) -> None:
        self._wanted = symbols
        self._aliases = {**ALIASES, **(extra_aliases or {})}
        self._session = FixSession(
            name="primexm-pricing",
            host=host,
            port=port,
            sender_comp_id=sender_comp_id,
            target_comp_id=target_comp_id,
            username=username,
            password=password,
            use_ssl=use_ssl,
            reset_on_logon=True,
            heartbeat_sec=heartbeat_sec,
            on_message=self._on_message,
            on_logon=self._on_logon,
        )
        self._book = QuoteBook()
        self._req_symbol: Dict[str, str] = {}  # MDReqID → platform symbol
        self._pxm_offered: Set[str] = set()
        self._security_list_task: Optional[asyncio.Task] = None
        self._watchdog_task: Optional[asyncio.Task] = None
        self._last_quote_mono = time.monotonic()
        self._rejected: Set[str] = set()
        self._tick_queue: asyncio.Queue = asyncio.Queue(maxsize=50_000)
        self.quotes_received = 0

    @property
    def current_prices(self) -> dict:
        return {}

    async def start(self) -> None:
        logger.info("PrimeXM pricing feed starting (%s:%s)", self._session.host, self._session.port)
        self._watchdog_task = asyncio.create_task(self._silence_watchdog(), name="primexm-watchdog")
        try:
            await self._session.run_forever()
        except asyncio.CancelledError:
            pass

    async def stop(self) -> None:
        for t in (self._watchdog_task, self._security_list_task):
            if t:
                t.cancel()
                with contextlib.suppress(asyncio.CancelledError, Exception):
                    await t
        await self._session.stop()
        logger.info("PrimeXM pricing feed stopped")

    async def get_tick(self) -> Optional[dict]:
        try:
            return self._tick_queue.get_nowait()
        except asyncio.QueueEmpty:
            return None

    # ── session callbacks ─────────────────────────────────────────────
    async def _on_logon(self) -> None:
        self._book.clear()
        self._req_symbol.clear()
        self._pxm_offered.clear()
        self._last_quote_mono = time.monotonic()
        await self._session.send("x", [("320", f"sl{int(time.time())}"), ("559", "4")])
        if self._security_list_task:
            self._security_list_task.cancel()
        self._security_list_task = asyncio.create_task(self._fallback_subscribe())

    async def _on_message(self, msg_type: str, msg: Message) -> None:
        if msg_type == "i":
            quote_id = get(msg, "117")
            if quote_id is not None:
                await self._session.send("b", [("117", quote_id)])
            touched = self._book.apply_mass_quote(msg, self._req_symbol.get)
            self._emit(touched)
        elif msg_type == "W":
            quote_id = get(msg, "117")
            if quote_id is not None:
                await self._session.send("b", [("117", quote_id)])
            symbol = self._req_symbol.get(get(msg, "262") or "")
            if symbol:
                self._book.apply_full_refresh(symbol, msg)
                self._emit([symbol])
        elif msg_type == "y":
            names = [v for t, v in msg if t == "55"]
            self._pxm_offered.update(names)
            if self._security_list_task:
                self._security_list_task.cancel()
                self._security_list_task = None
            await self._subscribe(names)
        elif msg_type == "Y":
            symbol = self._req_symbol.get(get(msg, "262") or "", get(msg, "262") or "?")
            if symbol not in self._rejected:
                self._rejected.add(symbol)
                logger.warning("PrimeXM rejected subscription for %s: %s", symbol, get(msg, "58"))
        else:
            logger.debug("PrimeXM pricing: unhandled 35=%s", msg_type)

    # ── subscribing ───────────────────────────────────────────────────
    async def _subscribe(self, pxm_names: Iterable[str]) -> None:
        pxm_names = list(pxm_names)
        wanted = {s.strip().upper() for s in self._wanted() if s}
        chosen: Dict[str, str] = {}
        for name in pxm_names:
            plat = to_platform(name, self._aliases)
            # first offered name wins (e.g. DE30 vs DE40 both → GER40)
            if plat in wanted and plat not in chosen.values():
                chosen[name] = plat
        for name, plat in sorted(chosen.items(), key=lambda kv: kv[1]):
            req_id = str(len(self._req_symbol) + 1)
            self._req_symbol[req_id] = plat
            await self._session.send("V", [
                ("262", req_id), ("263", "1"), ("264", "1"),
                ("146", "1"), ("55", name),
            ])
        missing = sorted(wanted - set(chosen.values()))
        logger.info(
            "PrimeXM: subscribed %d symbol(s); %d platform symbol(s) not offered by this taker%s",
            len(chosen), len(missing), f": {', '.join(missing)}" if missing else "",
        )
        unused = sorted(set(pxm_names) - set(chosen))
        if missing and unused:
            # Usually the same instrument under another name (e.g. a DAX
            # offered as "GER30"): map it with PRIMEXM_SYMBOL_ALIASES.
            logger.info("PrimeXM: offered but not mapped to a platform symbol: %s", ", ".join(unused))

    async def _fallback_subscribe(self) -> None:
        await asyncio.sleep(SECURITY_LIST_WAIT_SEC)
        if self._req_symbol:
            return
        logger.warning("PrimeXM: no SecurityList reply — subscribing by guessed symbol names")
        wanted = sorted({s.strip().upper() for s in self._wanted() if s})
        await self._subscribe(guess_pxm_name(s, self._aliases) for s in wanted)

    # ── output ────────────────────────────────────────────────────────
    def _emit(self, symbols: Iterable[str]) -> None:
        now = datetime.now(timezone.utc)
        ts = now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"
        for sym in symbols:
            best = self._book.best(sym)
            if not best:
                continue
            bid, ask = best
            self.quotes_received += 1
            self._last_quote_mono = time.monotonic()
            tick = {"symbol": sym, "bid": bid, "ask": ask, "timestamp": ts, "volume": 1}
            try:
                self._tick_queue.put_nowait(tick)
            except asyncio.QueueFull:
                with contextlib.suppress(asyncio.QueueEmpty):
                    self._tick_queue.get_nowait()
                self._tick_queue.put_nowait(tick)

    async def _silence_watchdog(self) -> None:
        from packages.common.src.market_hours import is_market_open

        while True:
            await asyncio.sleep(60.0)
            if not self._session.logged_on:
                continue
            gap = time.monotonic() - self._last_quote_mono
            if gap < DATA_SILENCE_SEC:
                continue
            try:
                forex_open, _ = is_market_open("EURUSD", "forex", None)
            except Exception:
                forex_open = True
            if not forex_open:
                continue
            logger.error("PrimeXM: no quotes for %.0fs with the market open — reconnecting", gap)
            self._last_quote_mono = time.monotonic()
            await self._session.disconnect()
