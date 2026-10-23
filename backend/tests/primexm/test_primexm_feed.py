"""Unit tests for the FIX 4.4 codec and the PrimeXM quote book.

Pure Python, no services. From the repo root:
    PYTHONPATH=backend python -m pytest backend/tests/primexm -q
"""
import importlib.util
import pathlib
import sys

from packages.common.src.fix44 import FixParser, encode, get

_FEED = pathlib.Path(__file__).resolve().parents[2] / "services" / "market-data" / "src" / "primexm_feed.py"
_spec = importlib.util.spec_from_file_location("primexm_feed", _FEED)
feed = importlib.util.module_from_spec(_spec)
sys.modules["primexm_feed"] = feed  # dataclasses look the module up
_spec.loader.exec_module(feed)


def wire(text: str) -> bytes:
    """A PDF-style "a=1 b=2" message → wire bytes with a correct 9= and 10=."""
    fields = [tuple(p.split("=", 1)) for p in text.split()]
    hdr = dict(fields[:6])
    rest = fields[6:]
    return encode(hdr["35"], hdr["49"], hdr["56"], int(hdr["34"]), rest, sending_time=hdr["52"])


def test_encode_matches_pdf_heartbeat_checksum():
    # Heartbeat example from the Rules of Engagement, re-framed: 9= and 10=
    # are derived, so check them against an independent computation.
    raw = encode("0", "T01", "XCxxx", 23667, [], sending_time="20151105-12:26:48.467")
    body_start = raw.index(b"35=")
    body_end = raw.rindex(b"10=")
    assert int(raw.split(b"\x01")[1][2:]) == body_end - body_start
    assert int(raw[body_end + 3 : body_end + 6]) == sum(raw[:body_end]) % 256


def test_parser_handles_split_chunks_and_garbage():
    a = encode("0", "A", "B", 1, [])
    b = encode("1", "A", "B", 2, [("112", "x10=y")])  # "10=" inside a value
    stream = b"junk" + a + b
    p = FixParser()
    out = []
    for i in range(0, len(stream), 7):
        out += p.feed(stream[i : i + 7])
    assert [get(m, "35") for m in out] == ["0", "1"]
    assert get(out[1], "112") == "x10=y"


def test_parser_drops_bad_checksum():
    good = encode("0", "A", "B", 1, [])
    bad = bytearray(encode("0", "A", "B", 2, []))
    bad[-4:-1] = b"000" if bad[-4:-1] != b"000" else b"001"
    p = FixParser()
    out = p.feed(bytes(bad) + good)
    assert [get(m, "34") for m in out] == ["1"]
    assert p.bad_frames == 1


def _book_from(*texts):
    book = feed.QuoteBook()
    ids = {"1": "EURUSD", "2": "XAUUSD", "3": "BTCUSD"}
    p = FixParser()
    touched = []
    for t in texts:
        for m in p.feed(wire(t)):
            touched += book.apply_mass_quote(m, ids.get)
    return book, touched


def test_mass_quote_from_demo_session():
    # First 35=i the demo server sent: three quote sets, one entry each.
    book, touched = _book_from(
        "8=FIX.4.4 35=i 49=XCD191 56=Q010 34=4 52=20261023-10:28:41.444 "
        "296=3 302=1 295=1 299=0 134=1000000000.0 135=1000000000.0 188=1.11991 190=1.11991 "
        "302=2 295=1 299=0 134=1000000.0 135=1000000.0 188=4023.964 190=4023.966 "
        "302=3 295=1 299=0 134=1000.0 135=1000.0 188=81644.26 190=81644.28"
    )
    assert touched == ["EURUSD", "XAUUSD", "BTCUSD"]
    assert book.best("XAUUSD") == (4023.964, 4023.966)


def test_partial_updates_and_cancel():
    book, _ = _book_from(
        "8=FIX.4.4 35=i 49=X 56=Q 34=1 52=20261023-10:28:41.444 "
        "296=1 302=2 295=1 299=0 134=1 135=1 188=4023.964 190=4023.966",
        # only prices change (sizes omitted = unchanged)
        "8=FIX.4.4 35=i 49=X 56=Q 34=2 52=20261023-10:28:41.454 "
        "296=1 302=2 295=1 299=0 188=4023.974 190=4023.976",
    )
    assert book.best("XAUUSD") == (4023.974, 4023.976)
    book2, _ = _book_from(
        "8=FIX.4.4 35=i 49=X 56=Q 34=1 52=20261023-10:28:41.444 "
        "296=1 302=1 295=1 299=0 134=1 135=1 188=1.1 190=1.2",
        "8=FIX.4.4 35=i 49=X 56=Q 34=2 52=20261023-10:28:41.454 "
        "296=1 302=1 295=1 299=0 134=-1",  # bid cancelled
    )
    assert book2.best("EURUSD") is None


def test_multi_layer_best_price():
    # Pricing Session Example FULL from the PDF: four layers of GBP/USD.
    book, _ = _book_from(
        "8=FIX.4.4 35=i 49=XCxxx 56=Q01 34=2 52=20151109-20:20:33.240 117=1 "
        "296=1 302=1 295=4 299=0 106=1 134=1000000 135=1000000 188=1.51218 190=1.51223 "
        "299=1 134=500000 135=50000 188=1.51218 190=1.51223 "
        "299=2 135=500000 190=1.51225 299=3 135=2000000 190=1.51226"
    )
    assert book.best("EURUSD") == (1.51218, 1.51223)


def test_full_refresh_replaces_book():
    book, _ = _book_from(
        "8=FIX.4.4 35=i 49=X 56=Q 34=1 52=20261023-10:28:41.444 "
        "296=1 302=1 295=1 299=0 134=1 135=1 188=1.0 190=1.5"
    )
    p = FixParser()
    (msg,) = p.feed(wire(
        "8=FIX.4.4 35=W 49=XCT1 56=Q004 34=136232 52=20200603-12:00:00.106 "
        "55=EUR/USD 262=1 7533=stream1 268=2 269=0 270=1.11941 271=1000000 299=0 106=7 "
        "269=1 270=1.11944 271=1000000 299=0 106=7"
    ))
    book.apply_full_refresh("EURUSD", msg)
    assert book.best("EURUSD") == (1.11941, 1.11944)


def test_symbol_mapping():
    aliases = {**feed.ALIASES, **feed.parse_aliases(" XNG/USD = NGAS ,bad, =X")}
    assert feed.to_platform("EUR/USD", aliases) == "EURUSD"
    assert feed.to_platform("XTI/USD", aliases) == "USOIL"
    assert feed.to_platform("DE30", aliases) == "GER40"
    assert feed.to_platform("XNG/USD", aliases) == "NGAS"
    assert feed.guess_pxm_name("GBPJPY", aliases) == "GBP/JPY"
    assert feed.guess_pxm_name("USOIL", aliases) == "XTI/USD"


def test_yahoo_history_mapping_and_resample():
    spec = importlib.util.spec_from_file_location(
        "yahoo_history", _FEED.parents[3] / "packages" / "common" / "src" / "yahoo_history.py")
    yh = importlib.util.module_from_spec(spec)
    sys.modules["yahoo_history"] = yh
    spec.loader.exec_module(yh)
    assert yh.yahoo_ticker("EURUSD") == "EURUSD=X"
    assert yh.yahoo_ticker("XAUUSD") == "GC=F"
    assert yh.yahoo_ticker("GER40") == "^GDAXI"
    assert yh.yahoo_ticker("AAPL") == "AAPL"
    one_h = [{"time": 3600 * h, "open": h, "high": h + 1, "low": h - 1, "close": h + 0.5, "volume": 1.0}
             for h in range(8)]
    four_h = yh._resample(one_h, 14400)
    assert [b["time"] for b in four_h] == [0, 14400]
    assert four_h[0] == {"time": 0, "open": 0, "high": 4, "low": -1, "close": 3.5, "volume": 4.0}


def test_yahoo_drops_forming_and_stub_bars_and_shifts_at_as_of():
    import asyncio
    import httpx

    yh = sys.modules.get("yahoo_history")
    if yh is None:
        test_yahoo_history_mapping_and_resample()
        yh = sys.modules["yahoo_history"]
    yh._basis_cache.clear()
    # Shape of the real GC=F reply at 14:28 UTC: data as of 14:18:09, a
    # closed 14:10 bar, a forming 14:15 bar and a flat 14:18 stub.
    base = 1792764000  # 14:00:00 UTC, on the 5m grid
    as_of = base + 18 * 60 + 9
    payload = {"chart": {"result": [{
        "meta": {"regularMarketTime": as_of, "regularMarketPrice": 4011.5},
        "timestamp": [base + 600, base + 900, base + 1080],
        "indicators": {"quote": [{
            "open": [4027.4, 4021.5, 4011.5], "high": [4027.4, 4022.6, 4011.5],
            "low": [4020.5, 4007.0, 4011.5], "close": [4021.7, 4007.6, 4011.5],
            "volume": [2442, 2595, 0],
        }]},
    }]}}
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda req: httpx.Response(200, json=payload)))
    asked = []

    async def mid_at(ts):
        asked.append(ts)
        return 3995.5  # our feed's mid at Yahoo's as_of

    async def run():
        orig = yh.time.time
        yh.time.time = lambda: as_of + 600  # "now" = 14:28
        try:
            return await yh.fetch_yahoo_bars("XAUUSD", "5m", count=10, live_mid_at=mid_at,
                                             live_mid_now=3990.0, client=client)
        finally:
            yh.time.time = orig

    bars = asyncio.run(run())
    assert [b["time"] for b in bars] == [base + 600]   # forming 14:15 and stub 14:18 dropped
    assert asked == [as_of]                             # basis read at Yahoo's own time
    assert abs(bars[0]["close"] - (4021.7 + 3995.5 - 4011.5)) < 1e-9
