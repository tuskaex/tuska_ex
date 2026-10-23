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
tickers every bar is shifted by (live mid − Yahoo's latest price) so the
history meets the live candle without a step. Forex (=X), indices and stocks
are used as-is.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import httpx

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


async def _chart(cl: httpx.AsyncClient, ticker: str, interval: str, period1: int, period2: int) -> list[dict]:
    try:
        resp = await cl.get(
            _URL.format(ticker=ticker),
            params={"interval": interval, "period1": period1, "period2": period2},
            headers=_HEADERS,
        )
        if resp.status_code != 200:
            logger.warning("Yahoo chart HTTP %s for %s %s: %s", resp.status_code, ticker, interval, resp.text[:200])
            return []
        result = (resp.json().get("chart") or {}).get("result") or []
    except Exception as e:
        logger.warning("Yahoo chart fetch failed for %s %s: %s", ticker, interval, e)
        return []
    if not result:
        return []
    r = result[0]
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
        v = (q.get("volume") or [None] * len(stamps))[i] or 0
        out.append({"time": int(t), "open": float(o), "high": float(h),
                    "low": float(l), "close": float(c), "volume": float(v)})
    return out


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


async def _basis(cl: httpx.AsyncClient, ticker: str, live_mid: Optional[float]) -> float:
    if not live_mid or live_mid <= 0 or not ticker.endswith("=F"):
        return 0.0
    now = time.monotonic()
    hit = _basis_cache.get(ticker)
    if hit and now - hit[1] < _BASIS_TTL_SEC:
        return hit[0]
    end = int(time.time())
    recent = await _chart(cl, ticker, "5m", end - 3 * 86400, end)
    if not recent:
        return 0.0
    basis = live_mid - recent[-1]["close"]
    if abs(basis) > live_mid * _BASIS_MAX_FRACTION:
        logger.warning("Yahoo basis for %s is %.4f vs live %.4f — too wide, not shifting", ticker, basis, live_mid)
        basis = 0.0
    _basis_cache[ticker] = (basis, now)
    return basis


async def fetch_yahoo_bars(
    symbol: str, tf: str, count: int = 2000, end_ts: Optional[int] = None,
    live_mid: Optional[float] = None, client: Optional[httpx.AsyncClient] = None,
) -> list[dict]:
    """Up to `count` bars for `symbol`/`tf` ending at `end_ts` (None = now),
    ascending [{time, open, high, low, close, volume}] with time in epoch
    seconds on the tf's UTC grid. Empty list when Yahoo has nothing."""
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
        raw = await _chart(cl, ticker, interval, period1, period2)
        if not raw:
            return []
        bars = _resample(raw, tf_sec)[-count:]
        shift = await _basis(cl, ticker, live_mid)
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
