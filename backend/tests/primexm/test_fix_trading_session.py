"""FixSession as a trading session (141=N) against a fake XCore on localhost.

Covers what a persisted-sequence session meets in production:
  * "MsgSeqNum too low, expecting N" logout → reconnect sending N
  * the counterparty restarting its own numbering (weekly reset) → accepted
  * TestRequest → Heartbeat with the same TestReqID
  * ResendRequest → SequenceReset-GapFill, never a replay
"""
import asyncio

from packages.common.src.fix44 import FixParser, FixSession, encode, get


async def _read_msg(reader, parser, pending):
    while not pending:
        data = await asyncio.wait_for(reader.read(65536), timeout=5)
        assert data, "client closed the connection"
        pending.extend(parser.feed(data))
    return pending.pop(0)


def test_trading_session_recovers_sequence_and_answers_session_messages():
    seen = {"logons": [], "heartbeat_112": None, "gapfill": None}

    async def scenario():
        done = asyncio.Event()
        conn = {"n": 0}

        async def handle(reader, writer):
            conn["n"] += 1
            parser, pending = FixParser(), []
            logon = await _read_msg(reader, parser, pending)
            seen["logons"].append((get(logon, "34"), get(logon, "141"), get(logon, "554")))
            if conn["n"] == 1:
                writer.write(encode("5", "XC", "T030", 7, [("58", "MsgSeqNum too low, expecting 50 but received 1")]))
                await writer.drain()
                writer.close()
                return
            # Second connection: our numbering restarted at 1 (weekly reset).
            writer.write(encode("A", "XC", "T030", 1, [("98", "0"), ("108", "30")]))
            writer.write(encode("1", "XC", "T030", 2, [("112", "PING42")]))
            await writer.drain()
            hb = await _read_msg(reader, parser, pending)
            assert get(hb, "35") == "0"
            seen["heartbeat_112"] = get(hb, "112")
            writer.write(encode("2", "XC", "T030", 3, [("7", "40"), ("16", "0")]))
            await writer.drain()
            gf = await _read_msg(reader, parser, pending)
            seen["gapfill"] = (get(gf, "35"), get(gf, "34"), get(gf, "123"), get(gf, "36"), get(gf, "43"))
            done.set()
            await asyncio.sleep(0.5)
            writer.close()

        server = await asyncio.start_server(handle, "127.0.0.1", 0)
        port = server.sockets[0].getsockname()[1]
        s = FixSession(
            name="test-trading", host="127.0.0.1", port=port,
            sender_comp_id="T030", target_comp_id="XC",
            username="u", password="secret", reset_on_logon=False,
        )
        s.BACKOFF_START_SEC = 0.1
        s.in_seq = 500  # we last saw 499 before the weekly reset
        runner = asyncio.create_task(s.run_forever())
        await asyncio.wait_for(done.wait(), timeout=10)
        in_seq_after = s.in_seq
        out_seq_after = s.out_seq
        await s.stop()
        runner.cancel()
        server.close()
        return in_seq_after, out_seq_after

    in_seq, out_seq = asyncio.run(scenario())
    # 1st logon at 1 with 141=N; after "expecting 50" the 2nd logon is 50.
    assert seen["logons"][0][:2] == ("1", "N")
    assert seen["logons"][1][:2] == ("50", "N")
    assert seen["heartbeat_112"] == "PING42"
    # GapFill: sent AT the requested BeginSeqNo, PossDup, pointing past our last.
    assert seen["gapfill"][0] == "4"
    assert seen["gapfill"][1] == "40"
    assert seen["gapfill"][2] == "Y" and seen["gapfill"][4] == "Y"
    assert int(seen["gapfill"][3]) == out_seq
    # Followed XCore's restart to 1 instead of disconnecting.
    assert in_seq == 4
