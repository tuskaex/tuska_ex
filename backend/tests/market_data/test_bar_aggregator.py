"""BarAggregator: a late tick must never rebuild a candle that already closed.

Run inside the market-data image (needs its dependencies):
    docker run --rm -v <repo>/backend/packages:/app/packages \
      -v <repo>/backend/services/market-data:/app/services/market_data \
      -v <repo>/backend/tests:/app/tests -e PYTHONPATH=/app tuskaex-market-data \
      sh -c "pip install -q pytest && python -m pytest -q /app/tests/market_data"
"""
from datetime import datetime, timezone

from services.market_data.src.bar_aggregator import BarAggregator


def _ts(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


def test_late_tick_joins_open_bar_and_never_reopens_a_closed_one():
    agg = BarAggregator()
    stored = []
    agg._spawn_store = lambda sym, tf, bar, start: stored.append(
        (tf, start, bar.open, bar.high, bar.low, bar.close, bar.tick_count)
    )
    n = 1_792_900_800  # a 5m (and 1h) boundary
    # A full 5m candle: 3990 → high 3997 → low 3983 → close 3991.
    for i, px in enumerate([3990, 3997, 3983, 3991]):
        agg.update("XAUUSD", px, px, _ts(n + 10 + i * 60))
    # Wall clock passed the boundary: the next tick opens the 05 candle and
    # the 00 candle is stored, complete.
    agg.update("XAUUSD", 3992, 3992, _ts(n + 301))
    five = [s for s in stored if s[0] == "5m"]
    assert five == [("5m", n, 3990, 3997, 3983, 3991, 4)]

    # A tick stamped 00:04:59 is processed only now (queue lag).
    agg.update("XAUUSD", 3988, 3988, _ts(n + 299))
    # Nothing new stored for the closed candle, and no rewind of the open one…
    assert [s for s in stored if s[0] == "5m"] == five
    assert agg._bar_timestamps["XAUUSD"]["5m"] == n + 300
    # …the late tick is in the open 05 candle.
    bar = agg._bars["XAUUSD"]["5m"]
    assert (bar.open, bar.low, bar.close, bar.tick_count) == (3992, 3988, 3988, 2)

    # The next on-time tick keeps building the same 05 candle.
    agg.update("XAUUSD", 3994, 3994, _ts(n + 320))
    assert [s for s in stored if s[0] == "5m"] == five
    assert agg._bars["XAUUSD"]["5m"].tick_count == 3


def test_seeded_open_candle_continues_after_restart():
    agg = BarAggregator()
    stored = []
    agg._spawn_store = lambda sym, tf, bar, start: stored.append((tf, start))
    day = 1_792_886_400  # a UTC midnight
    # Before the restart the day ran 4000 → 3970 … 4020, last 4010.
    agg.seed_open_bar("XAUUSD", "1d", day, 4000.0, 4020.0, 3970.0, 4010.0, 50_000)
    agg.update("XAUUSD", 4012, 4012, _ts(day + 6 * 3600))
    bar = agg._bars["XAUUSD"]["1d"]
    assert (bar.open, bar.high, bar.low, bar.close) == (4000.0, 4020.0, 3970.0, 4012)
    assert not [s for s in stored if s[0] == "1d"]  # same day: nothing closed


def test_no_admin_spread_passes_the_lp_quote_through():
    from services.market_data.src.spread_cache import StreamSpreadCache

    cache = StreamSpreadCache()  # nothing loaded: no admin spread anywhere
    assert cache.widen("EURUSD", 1.121812, 1.121884) == (1.12181, 1.12188)
