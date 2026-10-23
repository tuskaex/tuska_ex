"""Minimal FIX 4.4 initiator over asyncio — enough for a liquidity provider's
pricing and trading sessions (PrimeXM XCore today).

What it does:
  * frames, checksums and parses messages (FixParser / encode)
  * logs on, heartbeats, answers TestRequests, detects a dead link
  * reconnects with backoff, forever, until stop()
  * hands every application message to the owner's on_message callback

What it deliberately does NOT do: send ResendRequests. PrimeXM disables a
taker after 30 of them (it then has to be re-enabled by hand on their side),
and a price feed has no use for stale quotes anyway. Inbound gaps are logged
and accepted. When the counterparty asks US to resend, we answer with a
SequenceReset-GapFill: replaying an old order hours later is never wanted.

Sequence numbers live on the session object. With reset_on_logon=True (a
pricing session, 141=Y) both sides start at 1 on every logon. A trading
session (141=N) must carry them across reconnects; the owner can read and
seed out_seq / in_seq to persist them.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import ssl
import time
from datetime import datetime, timezone
from typing import Awaitable, Callable, Iterable, List, Optional, Sequence, Tuple

logger = logging.getLogger("fix44")

SOH = "\x01"
BEGIN_STRING = "FIX.4.4"

Field = Tuple[str, str]
Message = List[Field]


def fix_timestamp(dt: Optional[datetime] = None) -> str:
    dt = dt or datetime.now(timezone.utc)
    return dt.strftime("%Y%m%d-%H:%M:%S.") + f"{dt.microsecond // 1000:03d}"


def encode(
    msg_type: str,
    sender_comp_id: str,
    target_comp_id: str,
    seq: int,
    fields: Iterable[Field] = (),
    *,
    sending_time: Optional[str] = None,
    begin_string: str = BEGIN_STRING,
) -> bytes:
    """Build one wire message. `fields` keeps its order, so repeating groups
    are written exactly as given."""
    header: List[Field] = [
        ("35", msg_type),
        ("49", sender_comp_id),
        ("56", target_comp_id),
        ("34", str(seq)),
        ("52", sending_time or fix_timestamp()),
    ]
    body = "".join(f"{t}={v}{SOH}" for t, v in [*header, *fields]).encode()
    head = f"8={begin_string}{SOH}9={len(body)}{SOH}".encode()
    msg = head + body
    return msg + f"10={sum(msg) % 256:03d}{SOH}".encode()


def get(msg: Sequence[Field], tag: str) -> Optional[str]:
    """First value of `tag`, or None."""
    for t, v in msg:
        if t == tag:
            return v
    return None


def pretty(msg: Sequence[Field]) -> str:
    """Loggable form with the password masked."""
    return "|".join(f"{t}={'***' if t == '554' else v}" for t, v in msg)


class FixParser:
    """Turns a TCP byte stream into parsed messages.

    Frames on BodyLength (tag 9), not on the first `10=`, so a value that
    happens to contain "10=" can't split a message. A bad checksum or a
    garbled frame drops bytes up to the next "8=FIX" and carries on."""

    _START = b"8=FIX"

    def __init__(self) -> None:
        self._buf = bytearray()
        self.bad_frames = 0

    def feed(self, data: bytes) -> List[Message]:
        self._buf += data
        out: List[Message] = []
        while True:
            start = self._buf.find(self._START)
            if start < 0:
                # keep a possible partial "8=FI" at the tail
                del self._buf[: max(0, len(self._buf) - len(self._START))]
                return out
            if start:
                del self._buf[:start]
            first_soh = self._buf.find(b"\x01")
            if first_soh < 0:
                return out
            len_end = self._buf.find(b"\x01", first_soh + 1)
            if len_end < 0:
                return out
            len_field = bytes(self._buf[first_soh + 1 : len_end])
            if not len_field.startswith(b"9="):
                self._resync()
                continue
            try:
                body_len = int(len_field[2:])
            except ValueError:
                self._resync()
                continue
            body_end = len_end + 1 + body_len
            frame_end = body_end + 7  # "10=NNN\x01"
            if len(self._buf) < frame_end:
                return out
            trailer = bytes(self._buf[body_end:frame_end])
            if not (trailer.startswith(b"10=") and trailer.endswith(b"\x01")):
                self._resync()
                continue
            raw = bytes(self._buf[:body_end])
            try:
                ok = int(trailer[3:6]) == sum(raw) % 256
            except ValueError:
                ok = False
            if not ok:
                self._resync()
                continue
            del self._buf[:frame_end]
            out.append(self._split(raw))

    def _resync(self) -> None:
        self.bad_frames += 1
        nxt = self._buf.find(self._START, 1)
        if nxt < 0:
            self._buf.clear()
        else:
            del self._buf[:nxt]

    @staticmethod
    def _split(raw: bytes) -> Message:
        msg: Message = []
        for part in raw.decode("ascii", errors="replace").split(SOH):
            if not part:
                continue
            tag, _, value = part.partition("=")
            msg.append((tag, value))
        return msg


OnMessage = Callable[[str, Message], Awaitable[None]]
OnLogon = Callable[[], Awaitable[None]]


class FixSession:
    """One FIX initiator session that keeps itself connected."""

    LOGON_TIMEOUT_SEC = 10.0
    BACKOFF_START_SEC = 2.0
    BACKOFF_MAX_SEC = 60.0

    def __init__(
        self,
        *,
        name: str,
        host: str,
        port: int,
        sender_comp_id: str,
        target_comp_id: str,
        username: str,
        password: str,
        use_ssl: bool = False,
        reset_on_logon: bool = True,
        heartbeat_sec: int = 30,
        on_message: Optional[OnMessage] = None,
        on_logon: Optional[OnLogon] = None,
    ) -> None:
        self.name = name
        self.host = host
        self.port = int(port)
        self.sender_comp_id = sender_comp_id
        self.target_comp_id = target_comp_id
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.reset_on_logon = reset_on_logon
        self.heartbeat_sec = max(5, int(heartbeat_sec))
        self.on_message = on_message
        self.on_logon = on_logon

        self.out_seq = 1  # next MsgSeqNum we send
        self.in_seq = 1   # next MsgSeqNum we expect
        self.logged_on = False
        self.last_logout_text: Optional[str] = None

        self._running = False
        self._writer: Optional[asyncio.StreamWriter] = None
        self._send_lock = asyncio.Lock()
        self._last_sent = 0.0
        self._last_recv = 0.0
        self._test_req_pending: Optional[str] = None
        self._logon_event = asyncio.Event()
        self._log = logging.getLogger(f"fix44.{name}")

    # ── public ────────────────────────────────────────────────────────
    async def run_forever(self) -> None:
        self._running = True
        backoff = self.BACKOFF_START_SEC
        while self._running:
            started = time.monotonic()
            try:
                await self._run_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                if self._running:  # not just our own stop() closing the socket
                    self._log.warning("session error: %s", str(exc) or repr(exc))
            finally:
                await self._close()
            if not self._running:
                break
            # A session that stayed up for a while earns a fast reconnect.
            if time.monotonic() - started > 120:
                backoff = self.BACKOFF_START_SEC
            self._log.info("reconnecting in %.0fs", backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, self.BACKOFF_MAX_SEC)

    async def stop(self) -> None:
        self._running = False
        if self._writer and self.logged_on:
            with contextlib.suppress(Exception):
                await self.send("5", [])
        await self._close()

    async def send(self, msg_type: str, fields: Iterable[Field] = ()) -> None:
        async with self._send_lock:
            w = self._writer
            if w is None:
                raise ConnectionError(f"{self.name}: not connected")
            w.write(encode(msg_type, self.sender_comp_id, self.target_comp_id, self.out_seq, fields))
            self.out_seq += 1
            self._last_sent = time.monotonic()
            await w.drain()

    async def disconnect(self) -> None:
        """Drop the link; run_forever reconnects (and the owner resubscribes)."""
        await self._close()

    # ── one connection ────────────────────────────────────────────────
    async def _run_once(self) -> None:
        ssl_ctx = None
        if self.use_ssl:
            # PrimeXM trading sessions use a self-signed certificate.
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            ssl_ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        self._log.info("connecting to %s:%s", self.host, self.port)
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port, ssl=ssl_ctx), timeout=15
            )
        except asyncio.TimeoutError:
            # Live LP endpoints drop packets from IPs they haven't whitelisted.
            raise ConnectionError(
                f"no TCP answer from {self.host}:{self.port} in 15s — "
                "is this server's public IP whitelisted with the LP?"
            ) from None
        self._writer = writer
        self._logon_event.clear()
        self.logged_on = False
        self.last_logout_text = None
        if self.reset_on_logon:
            self.out_seq = 1
            self.in_seq = 1
        self._last_recv = time.monotonic()
        self._test_req_pending = None

        await self.send("A", [
            ("98", "0"),
            ("108", str(self.heartbeat_sec)),
            ("141", "Y" if self.reset_on_logon else "N"),
            ("553", self.username),
            ("554", self.password),
        ])

        parser = FixParser()
        hb_task = asyncio.create_task(self._heartbeat_loop(), name=f"fix-{self.name}-hb")
        logon_deadline = time.monotonic() + self.LOGON_TIMEOUT_SEC
        try:
            while self._running:
                timeout = 1.0
                try:
                    data = await asyncio.wait_for(reader.read(65536), timeout=timeout)
                except asyncio.TimeoutError:
                    if not self.logged_on and time.monotonic() > logon_deadline:
                        raise ConnectionError("no Logon reply within %.0fs" % self.LOGON_TIMEOUT_SEC)
                    if hb_task.done():
                        hb_task.result()  # surfaces the dead-link error
                    continue
                if not data:
                    raise ConnectionError(
                        "connection closed by peer"
                        + (f" ({self.last_logout_text})" if self.last_logout_text else "")
                    )
                self._last_recv = time.monotonic()
                for msg in parser.feed(data):
                    await self._handle(msg)
                if parser.bad_frames:
                    self._log.warning("dropped %d malformed frame(s)", parser.bad_frames)
                    parser.bad_frames = 0
        finally:
            hb_task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await hb_task

    async def _handle(self, msg: Message) -> None:
        msg_type = get(msg, "35") or ""
        try:
            seq = int(get(msg, "34") or 0)
        except ValueError:
            seq = 0
        poss_dup = get(msg, "43") == "Y"

        if msg_type == "4":  # SequenceReset — sets the next inbound number itself
            new_seq = int(get(msg, "36") or 0)
            if new_seq > self.in_seq:
                self.in_seq = new_seq
            return

        if seq:
            if seq > self.in_seq:
                if not (msg_type == "A" and self.reset_on_logon):
                    self._log.warning(
                        "inbound gap: expected %d, got %d — accepted (no ResendRequest)",
                        self.in_seq, seq,
                    )
                self.in_seq = seq + 1
            elif seq < self.in_seq:
                if poss_dup:
                    return  # a replay we already have
                if msg_type != "5":
                    raise ConnectionError(f"MsgSeqNum too low: expected {self.in_seq}, got {seq}")
            else:
                self.in_seq = seq + 1

        if msg_type == "A":
            self.logged_on = True
            self._logon_event.set()
            self._log.info("logged on (heartbeat %ss)", get(msg, "108") or self.heartbeat_sec)
            if self.on_logon:
                await self.on_logon()
        elif msg_type == "0":
            if self._test_req_pending and get(msg, "112") == self._test_req_pending:
                self._test_req_pending = None
        elif msg_type == "1":
            await self.send("0", [("112", get(msg, "112") or "")])
        elif msg_type == "2":
            await self._answer_resend(msg)
        elif msg_type == "3":
            self._log.warning("session Reject: %s", pretty(msg))
        elif msg_type == "5":
            self.last_logout_text = get(msg, "58") or ""
            self._log.warning("Logout from counterparty: %s", self.last_logout_text or "(no reason)")
            if self.logged_on:
                with contextlib.suppress(Exception):
                    await self.send("5", [])
            raise ConnectionError(f"logged out: {self.last_logout_text or 'no reason'}")
        elif self.on_message:
            await self.on_message(msg_type, msg)

    async def _answer_resend(self, msg: Message) -> None:
        try:
            begin = int(get(msg, "7") or 1)
        except ValueError:
            begin = 1
        self._log.info("ResendRequest from %d — answering with GapFill to %d", begin, self.out_seq)
        async with self._send_lock:
            w = self._writer
            if w is None:
                return
            now = fix_timestamp()
            w.write(encode(
                "4", self.sender_comp_id, self.target_comp_id, begin,
                [("43", "Y"), ("122", now), ("123", "Y"), ("36", str(self.out_seq))],
                sending_time=now,
            ))
            self._last_sent = time.monotonic()
            await w.drain()

    async def _heartbeat_loop(self) -> None:
        hb = self.heartbeat_sec
        while True:
            await asyncio.sleep(1.0)
            if not self.logged_on:
                continue
            now = time.monotonic()
            if now - self._last_sent >= hb:
                await self.send("0", [])
            silent = now - self._last_recv
            if self._test_req_pending is None and silent > hb * 1.2:
                self._test_req_pending = f"TR{int(time.time() * 1000)}"
                await self.send("1", [("112", self._test_req_pending)])
            elif self._test_req_pending is not None and silent > hb * 2.5:
                raise ConnectionError(f"no data for {silent:.0f}s after TestRequest — link is dead")

    async def _close(self) -> None:
        self.logged_on = False
        w, self._writer = self._writer, None
        if w is not None:
            with contextlib.suppress(Exception):
                w.close()
                await asyncio.wait_for(w.wait_closed(), timeout=3)
