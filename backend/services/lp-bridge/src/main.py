"""LP bridge — holds the PrimeXM XCore TRADING session (FIX 4.4, port 25203).

Today it logs on, stays connected and writes every FIX message to the log
(password masked), which is what PrimeXM needs to see the session and to
investigate problems. It sends NO orders: routing A-book trades through it
is a separate, later step.

Why a service of its own: XCore allows one live session per SenderCompID,
and the gateway runs several workers. This worker is the single owner.

Sequence numbers: trading sessions log on with 141=N, so both sides carry
MsgSeqNum across reconnects and restarts. They are saved to Redis every
couple of seconds; if a crash loses the last few, XCore's "MsgSeqNum too
low, expecting N" logout is parsed and the session resumes at N.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import signal
import time

from packages.common.src.config import get_settings
from packages.common.src.fix44 import FixSession, Message, get
from packages.common.src.redis_client import redis_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s")
logger = logging.getLogger("lp-bridge")

SEQ_KEY = "primexm:trading:seq"        # hash: out, in, sender
STATUS_KEY = "primexm:trading:status"  # hash: state, since, last_logout, updated
SEQ_SAVE_SEC = 2.0

settings = get_settings()

_REQUIRED = (
    "PRIMEXM_TRADING_HOST", "PRIMEXM_TRADING_PORT",
    "PRIMEXM_TRADING_SENDER_COMP_ID", "PRIMEXM_TRADING_TARGET_COMP_ID",
    "PRIMEXM_TRADING_USERNAME", "PRIMEXM_TRADING_PASSWORD",
)


class TradingBridge:
    def __init__(self) -> None:
        self.session = FixSession(
            name="primexm-trading",
            host=settings.PRIMEXM_TRADING_HOST,
            port=settings.PRIMEXM_TRADING_PORT,
            sender_comp_id=settings.PRIMEXM_TRADING_SENDER_COMP_ID,
            target_comp_id=settings.PRIMEXM_TRADING_TARGET_COMP_ID,
            username=settings.PRIMEXM_TRADING_USERNAME,
            password=settings.PRIMEXM_TRADING_PASSWORD,
            use_ssl=settings.PRIMEXM_TRADING_SSL,
            reset_on_logon=False,
            heartbeat_sec=settings.PRIMEXM_HEARTBEAT_SEC,
            on_message=self._on_message,
            on_logon=self._on_logon,
            log_messages=True,
        )
        self._saved = (0, 0)

    async def run(self) -> None:
        await self._load_seq()
        saver = asyncio.create_task(self._seq_saver(), name="seq-saver")
        try:
            await self.session.run_forever()
        finally:
            saver.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await saver
            await self._save_seq()
            await self._status("stopped")

    async def stop(self) -> None:
        await self.session.stop()

    # ── sequence numbers ──────────────────────────────────────────────
    async def _load_seq(self) -> None:
        try:
            raw = await redis_client.hgetall(SEQ_KEY)
        except Exception as exc:
            logger.warning("could not read saved MsgSeqNums (%s) — starting at 1", exc)
            return
        data = {(k.decode() if isinstance(k, bytes) else k): (v.decode() if isinstance(v, bytes) else v)
                for k, v in (raw or {}).items()}
        if data.get("sender") != self.session.sender_comp_id:
            # New credentials (e.g. demo → live): their numbering starts fresh.
            logger.info("no saved MsgSeqNums for %s — starting at 1", self.session.sender_comp_id)
            return
        self.session.out_seq = max(1, int(data.get("out") or 1))
        self.session.in_seq = max(1, int(data.get("in") or 1))
        self._saved = (self.session.out_seq, self.session.in_seq)
        logger.info("resuming MsgSeqNums: out=%d in=%d", self.session.out_seq, self.session.in_seq)

    async def _save_seq(self) -> None:
        cur = (self.session.out_seq, self.session.in_seq)
        if cur == self._saved:
            return
        try:
            await redis_client.hset(SEQ_KEY, mapping={
                "out": cur[0], "in": cur[1], "sender": self.session.sender_comp_id,
            })
            self._saved = cur
        except Exception as exc:
            logger.warning("could not save MsgSeqNums: %s", exc)

    async def _seq_saver(self) -> None:
        last_state = None
        while True:
            await asyncio.sleep(SEQ_SAVE_SEC)
            await self._save_seq()
            state = "logged_on" if self.session.logged_on else "disconnected"
            if state != last_state:
                await self._status(state)
                last_state = state

    async def _status(self, state: str) -> None:
        with contextlib.suppress(Exception):
            await redis_client.hset(STATUS_KEY, mapping={
                "state": state,
                "last_logout": self.session.last_logout_text or "",
                "updated": int(time.time()),
            })

    # ── session callbacks ─────────────────────────────────────────────
    async def _on_logon(self) -> None:
        logger.info("PrimeXM trading session logged on (%s → %s)",
                    self.session.sender_comp_id, self.session.target_comp_id)
        await self._save_seq()
        await self._status("logged_on")
        account = (settings.PRIMEXM_TRADING_ACCOUNT or "").strip()
        if account:
            # Read-only: a one-off balance / positions snapshot (35=AP, 263=0).
            await self.session.send("AP", [
                ("710", f"snap{int(time.time())}"), ("1", account), ("263", "0"),
            ])

    async def _on_message(self, msg_type: str, msg: Message) -> None:
        # Every message is already logged by the session (log_messages=True).
        # Pick out the ones worth a plain-language line.
        if msg_type == "8":
            logger.warning(
                "unexpected ExecutionReport (this bridge sends no orders): ClOrdID=%s status=%s text=%s",
                get(msg, "11"), get(msg, "39"), get(msg, "58"),
            )
        elif msg_type == "AP":
            if get(msg, "728"):
                logger.warning("position report rejected: %s", get(msg, "58"))
            else:
                logger.info("account %s: balance=%s equity=%s margin_used=%s",
                            get(msg, "1"), get(msg, "5001"), get(msg, "5002"), get(msg, "5004"))
        elif msg_type == "j":
            logger.warning("BusinessMessageReject: %s", get(msg, "58"))


async def main() -> None:
    if not settings.PRIMEXM_TRADING_ENABLED:
        logger.info("PRIMEXM_TRADING_ENABLED is false — lp-bridge idle")
        await asyncio.Event().wait()  # stay up quietly; restart: always would loop otherwise
    missing = [n for n in _REQUIRED if not getattr(settings, n)]
    if missing:
        logger.error("PRIMEXM_TRADING_ENABLED=true but %s not set — lp-bridge idle", ", ".join(missing))
        await asyncio.Event().wait()

    bridge = TradingBridge()
    loop = asyncio.get_running_loop()
    stopping = asyncio.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stopping.set)

    runner = asyncio.create_task(bridge.run())
    await asyncio.wait([runner, asyncio.create_task(stopping.wait())], return_when=asyncio.FIRST_COMPLETED)
    if stopping.is_set():
        logger.info("shutting down — sending Logout")
        await bridge.stop()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await asyncio.wait_for(runner, timeout=10)


if __name__ == "__main__":
    asyncio.run(main())
