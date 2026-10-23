"""Yahoo Finance chart history — keyless chart backfill for symbols the live
feed (PrimeXM FIX) can price but can't give history for.

    GET https://query1.finance.yahoo.com/v8/finance/chart/{ticker}
        ?interval=5m&period1=<unix s>&period2=<unix s>
    resp: chart.result[0].timestamp[] + indicators.quote[0].{open,high,low,close,volume}[]

Yahoo keeps intraday history for a limited window (1m: 7 days, 5m–30m:
60 days, 1h: 730 days); older requests come back empty and the caller falls
through to its next source. 4h is built from 1h bars.

Yahoo has no spot metals or spot oil, only futures (GC=F, CL=F, …), which
trade a few dollars away from the spot price the live feed streams. For those
tickers every bar is shifted by (our live mid − Yahoo's price), both taken at
Yahoo's own data time, so the history meets the live candle without a step.
Forex (=X), indices and stocks are used as-is.

Yahoo delays some markets (COMEX gold ~10 min) and its newest bar is still
forming, so only bars that had closed by Yahoo's data time are returned; the
live aggregator owns everything after that. Callers store these bars with
overwrite=False.
"""
from __future__ import annotations

import logging
import time
from typing import Awaitable, Callable, Optional

import httpx

LiveMidAt = Callable[[int], Awaitable[Optional[float]]]

logger = logging.getLogger("yahoo_history")

_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
_HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"}

# Platform symbol → Yahoo ticker, where the "EURUSD=X" rule doesn't apply.
_TICKERS: dict[str, str] = {
    "XAUUSD": "GC=F", "XAGUSD": "SI=F", "XPTUSD": "PL=F", "XPDUSD": "PA=F",
    "USOIL": "CL=F", "UKOIL": "BZ=F", "NATGAS": "NG=F",
    "US30": "^DJI", "US500": "^GSPC", "NAS100": "^NDX", "US100": "^NDX",
    "UK100": "^FTSE", "GER40": "^GDAXI", "JPN225": "^N225", "AUS200": "^AXJO",
}

# tf → (Yahoo interval, max lookback in seconds Yahoo serves for it)
_INTERVALS: dict[str, tuple[str, int]] = {
    "1m": ("1m", 7 * 86400),
    "5m": ("5m", 59 * 86400),
    "15m": ("15m", 59 * 86400),
    "30m": ("30m", 59 * 86400),
    "1h": ("60m", 729 * 86400),
    "4h": ("60m", 729 * 86400),
    "1d": ("1d", 20 * 365 * 86400),
}
_TF_SECONDS = {"1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400}

# Futures basis (live spot − Yahoo future) per ticker, refreshed every 10 min.
_basis_cache: dict[str, tuple[float, float]] = {}
_BASIS_TTL_SEC = 600.0
# A basis wider than this share of the price means the two quotes aren't the
# same market (contract roll, bad tick): don't shift at all.
_BASIS_MAX_FRACTION = 0.05


def yahoo_ticker(symbol: str) -> str:
    s = symbol.upper()
    if s in _TICKERS:
        return _TICKERS[s]
    if len(s) == 6 and s.isalpha():
        return f"{s}=X"
    return s  # stocks: AAPL, TSLA, …


def yahoo_supports(tf: str) -> bool:
    return tf in _INTERVALS


_INTERVAL_SECONDS = {"1m": 60, "5m": 300, "15m": 900, "30m": 1800, "60m": 3600, "1d": 86400}


class _Chart:
    def __init__(self, bars: list[dict], as_of: int, last_price: Optional[float]) -> None:
        self.bars = bars            # complete bars only, ascending
        self.as_of = as_of          # Yahoo's "data valid at" time (epoch s)
        self.last_price = last_price  # Yahoo's price at as_of


async def _chart(cl: httpx.AsyncClient, ticker: str, interval: str, period1: int, period2: int) -> Optional[_Chart]:
    """One chart request. Yahoo delays some markets (CME/COMEX futures by
    ~10 min) and ends the series with a still-forming bar, sometimes a flat
    off-grid stub. Only bars that had fully closed by Yahoo's own data time
    (meta.regularMarketTime) are kept."""
    try:
        resp = await cl.get(
            _URL.format(ticker=ticker),
            params={"interval": interval, "period1": period1, "period2": period2},
            headers=_HEADERS,
        )
        if resp.status_code != 200:
            logger.warning("Yahoo chart HTTP %s for %s %s: %s", resp.status_code, ticker, interval, resp.text[:200])
            return None
        result = (resp.json().get("chart") or {}).get("result") or []
    except Exception as e:
        logger.warning("Yahoo chart fetch failed for %s %s: %s", ticker, interval, e)
        return None
    if not result:
        return None
    r = result[0]
    meta = r.get("meta") or {}
    as_of = int(meta.get("regularMarketTime") or time.time())
    last_price = meta.get("regularMarketPrice")
    step = _INTERVAL_SECONDS.get(interval, 0)
    # Daily bars are stamped at the exchange's midnight (EURUSD=X: 23:00 UTC
    # the day before). Shift by the exchange offset to get the trading date.
    day_offset = int(meta.get("gmtoffset") or 0) if interval == "1d" else 0
    stamps = r.get("timestamp") or []
    q = ((r.get("indicators") or {}).get("quote") or [{}])[0]
    out: list[dict] = []
    for i, t in enumerate(stamps):
        try:
            o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        except (KeyError, IndexError, TypeError):
            continue
        if None in (o, h, l, c):
            continue
        if interval == "1d":
            t = (int(t) + day_offset) // 86400 * 86400
        if step and int(t) + step > as_of:
            continue  # still forming at as_of (this also catches the flat stub)
        v = (q.get("volume") or [None] * len(stamps))[i] or 0
        out.append({"time": int(t), "open": float(o), "high": float(h),
                    "low": float(l), "close": float(c), "volume": float(v)})
    return _Chart(out, as_of, float(last_price) if last_price else None)


def _resample(bars: list[dict], tf_seconds: int) -> list[dict]:
    """Merge bars into UTC-grid slots of tf_seconds (ascending in, ascending out)."""
    slots: dict[int, dict] = {}
    for b in sorted(bars, key=lambda x: x["time"]):
        slot = (b["time"] // tf_seconds) * tf_seconds
        cur = slots.get(slot)
        if cur is None:
            slots[slot] = {**b, "time": slot}
        else:
            cur["high"] = max(cur["high"], b["high"])
            cur["low"] = min(cur["low"], b["low"])
            cur["close"] = b["close"]
            cur["volume"] += b["volume"]
    return [slots[k] for k in sorted(slots)]


async def _basis(
    cl: httpx.AsyncClient, ticker: str, chart: _Chart,
    live_mid_at: Optional[LiveMidAt], live_mid_now: Optional[float],
) -> float:
    """live spot − Yahoo future, both read at the same moment (Yahoo's as_of),
    so the ~10 min Yahoo delay doesn't leak market movement into the shift."""
    if not ticker.endswith("=F"):
        return 0.0
    now = time.monotonic()
    hit = _basis_cache.get(ticker)
    if hit and now - hit[1] < _BASIS_TTL_SEC:
        return hit[0]
    ref = chart
    if ref.last_price is None or time.time() - ref.as_of > 3600:
        # A scroll-back chart says nothing about now: ask for the latest point.
        end = int(time.time())
        ref = await _chart(cl, ticker, "5m", end - 3 * 86400, end) or ref
    if ref.last_price is None:
        return 0.0
    live = await live_mid_at(ref.as_of) if live_mid_at else None
    if live is None:
        # No recorded tick at as_of (feed was down) — the current mid is the
        # next best thing; off by however much the market moved since.
        live = live_mid_now
    if not live or live <= 0:
        return 0.0
    basis = live - ref.last_price
    if abs(basis) > live * _BASIS_MAX_FRACTION:
        logger.warning("Yahoo basis for %s is %.4f vs live %.4f — too wide, not shifting", ticker, basis, live)
        basis = 0.0
    _basis_cache[ticker] = (basis, now)
    return basis


async def fetch_yahoo_bars(
    symbol: str, tf: str, count: int = 2000, end_ts: Optional[int] = None,
    live_mid_at: Optional[LiveMidAt] = None, live_mid_now: Optional[float] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> list[dict]:
    """Up to `count` CLOSED bars for `symbol`/`tf` ending at `end_ts` (None =
    now), ascending [{time, open, high, low, close, volume}] with time in epoch
    seconds on the tf's UTC grid. Empty list when Yahoo has nothing.

    `live_mid_at(ts)` returns our own feed's mid at a past moment; it lets a
    futures-based symbol be shifted onto the live spot price accurately."""
    spec = _INTERVALS.get(tf)
    if not spec:
        return []
    interval, max_back = spec
    tf_sec = _TF_SECONDS[tf]
    now = int(time.time())
    period2 = min(int(end_ts or now), now)
    oldest_allowed = now - max_back
    if period2 <= oldest_allowed:
        return []
    # ×1.6 covers weekends and session gaps (markets aren't 24/7).
    period1 = max(oldest_allowed, period2 - int(count * tf_sec * 1.6))
    ticker = yahoo_ticker(symbol)

    owns = client is None
    cl = client or httpx.AsyncClient(timeout=20.0)
    try:
        chart = await _chart(cl, ticker, interval, period1, period2)
        if not chart or not chart.bars:
            return []
        # A resampled slot (4h from 1h) is only complete once it has ended.
        bars = [b for b in _resample(chart.bars, tf_sec) if b["time"] + tf_sec <= chart.as_of][-count:]
        shift = await _basis(cl, ticker, chart, live_mid_at, live_mid_now)
    finally:
        if owns:
            await cl.aclose()
    if shift:
        for b in bars:
            for k in ("open", "high", "low", "close"):
                b[k] += shift
    logger.info("Yahoo %s (%s) %s: %d bars%s", symbol, ticker, tf, len(bars),
                f", shifted {shift:+.4f} to spot" if shift else "")
    return bars
