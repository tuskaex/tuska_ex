"""One-off repair: rebuild live-period candles from the recorded ticks.

Until the market-data fix of 2026-10-26, a tick processed a few seconds late
re-opened a candle that had already closed, and that one-tick candle then
replaced the full one (flat "dash" candles on the charts). The ticks
themselves were recorded correctly in TimescaleDB, so every candle since
`--since` is rebuilt from them, for every symbol and timeframe:

  * ohlc_bars (what the web chart reads) — overwritten for those slots
  * the Redis lists bars:{SYMBOL}:{TF} (what the desk terminal and the
    gateway's re-persist loop read) — replaced with the rebuilt candles plus
    any bar that closed while this ran

Only whole buckets are written: the first partial bucket after `--since` and
the still-forming one are skipped. Run inside the gateway container:

    python -m services.gateway.src.rebuild_bars_from_ticks --since 2026-10-23T10:45:00Z
    (add --dry-run to only print counts)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import time
from datetime import datetime, timezone

from sqlalchemy import text

from packages.common.src import bars_store
from packages.common.src.database import AsyncSessionLocal
from packages.common.src.redis_client import redis_client

from .services.timescale_bars import _TF_INTERVAL, _session_maker

LIST_MAX = 1000  # same cap as the aggregator's ltrim


async def _tick_bars(symbol: str, tf: str, start: int, end: int) -> list[dict]:
    sql = text(
        f"""
        SELECT extract(epoch FROM time_bucket(INTERVAL '{_TF_INTERVAL[tf]}', time))::bigint AS ts,
               first((bid + ask) / 2.0, time), max((bid + ask) / 2.0),
               min((bid + ask) / 2.0),        last((bid + ask) / 2.0, time)
        FROM ticks
        WHERE symbol = :sym AND time >= to_timestamp(:start) AND time < to_timestamp(:end)
        GROUP BY 1 ORDER BY 1
        """
    )
    async with _session_maker()() as s:
        rows = (await s.execute(sql, {"sym": symbol, "start": start, "end": end})).all()
    return [
        {"time": int(r[0]), "open": float(r[1]), "high": float(r[2]),
         "low": float(r[3]), "close": float(r[4]), "volume": 0.0}
        for r in rows
    ]


async def _replace_list(symbol: str, tf: str, rebuilt: list[dict], cutoff: int) -> int:
    """bars:{SYMBOL}:{TF} newest-first: bars that closed at/after `cutoff`
    while we worked (kept as the aggregator wrote them) + the rebuilt ones."""
    key = f"bars:{symbol}:{tf}"
    fresh: dict[int, str] = {}
    for raw in await redis_client.lrange(key, 0, 50):
        try:
            b = json.loads(raw)
            if int(b["time"]) >= cutoff and int(b["time"]) not in fresh:
                fresh[int(b["time"])] = raw if isinstance(raw, str) else raw.decode()
        except (ValueError, KeyError, TypeError):
            continue
    entries = [fresh[t] for t in sorted(fresh, reverse=True)]
    for b in reversed(rebuilt):
        if b["time"] in fresh:
            continue
        entries.append(json.dumps({
            "symbol": symbol, "timeframe": tf, "time": b["time"],
            "open": b["open"], "high": b["high"], "low": b["low"], "close": b["close"],
            "volume": 0.0, "tick_count": 0,
        }))
        if len(entries) >= LIST_MAX:
            break
    if not entries:
        return 0
    pipe = redis_client.pipeline(transaction=True)
    pipe.delete(key)
    pipe.rpush(key, *entries)
    await pipe.execute()
    return len(entries)


async def main(since: datetime, dry_run: bool) -> None:
    since_epoch = int(since.timestamp())
    async with _session_maker()() as s:
        symbols = [r[0] for r in (await s.execute(
            text("SELECT DISTINCT symbol FROM ticks WHERE time >= to_timestamp(:t)"), {"t": since_epoch},
        )).all()]
    print(f"{len(symbols)} symbols with ticks since {since.isoformat()}")
    total = 0
    for sym in sorted(symbols):
        line = []
        for tf, sec in bars_store.TF_SECONDS.items():
            if tf not in _TF_INTERVAL:
                continue
            start = -(-since_epoch // sec) * sec          # first WHOLE bucket
            end = (int(time.time()) // sec) * sec         # exclude the forming one
            if end <= start:
                continue
            bars = await _tick_bars(sym, tf, start, end)
            if not bars:
                continue
            line.append(f"{tf}:{len(bars)}")
            total += len(bars)
            if dry_run:
                continue
            async with AsyncSessionLocal() as db:
                for i in range(0, len(bars), 2000):
                    await bars_store.upsert_bars(db, sym, tf, bars[i:i + 2000], overwrite=True)
                await db.commit()
            # The newest LIST_MAX bars by time, newest first.
            await _replace_list(sym, tf, sorted(bars, key=lambda b: b["time"])[-LIST_MAX:], end)
        print(f"  {sym:8} {' '.join(line)}")
    print(f"{'would rebuild' if dry_run else 'rebuilt'} {total} candles")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--since", required=True, help="UTC ISO time, e.g. 2026-10-23T10:45:00Z")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    since = datetime.fromisoformat(a.since.replace("Z", "+00:00")).astimezone(timezone.utc)
    asyncio.run(main(since, a.dry_run))
