"""Transactional email via SMTP (Hostinger, SES, Gmail, etc.).

Single send path — `send_email(to, subject, html, text)` — used by every
business event (welcome, deposit, withdrawal, password reset). The
old `send_password_reset_email` is kept as a thin wrapper so existing
callers don't change.

The actual `smtplib` call runs in a thread (asyncio.to_thread) so the
event loop isn't blocked while SMTP handshakes.
"""
from __future__ import annotations

import asyncio
import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path
from typing import Optional

from .config import get_settings

logger = logging.getLogger(__name__)

# Fallback sender name when no tenant brand applies. Mirrors BRAND_NAME in the
# two frontends; email_templates/base.py hard-codes the same word.
PLATFORM_BRAND_NAME = "TuskaEx"

# Inline-attached brand logo. Bundled with the package so we don't depend
# on an outbound URL fetch — every email gets the wordmark whether or not
# the recipient's client has remote-image loading enabled. The CID below
# must match LOGO_CID in email_templates/base.py.
_LOGO_PATH = (
    Path(__file__).parent / "email_templates" / "assets" / "tuskaex-logo.png"
)
_LOGO_CID = "tuskaex-logo"
_LOGO_BYTES: bytes | None = None


def _logo_bytes() -> bytes | None:
    """Read the logo PNG once, cache for the process lifetime. Returns
    None if the file is missing so a packaging hiccup doesn't break sending
    — emails still go out with a broken-image icon instead of a 500."""
    global _LOGO_BYTES
    if _LOGO_BYTES is not None:
        return _LOGO_BYTES
    try:
        _LOGO_BYTES = _LOGO_PATH.read_bytes()
    except FileNotFoundError:
        logger.warning("Email logo missing at %s — emails will render without it", _LOGO_PATH)
        _LOGO_BYTES = b""
    return _LOGO_BYTES or None


def smtp_configured() -> bool:
    s = get_settings()
    return bool(s.SMTP_HOST and str(s.SMTP_HOST).strip())


def _from_address() -> str:
    s = get_settings()
    addr = (s.SMTP_FROM or s.SMTP_USER or "").strip()
    if not addr:
        raise ValueError("SMTP_FROM or SMTP_USER must be set when SMTP_HOST is set")
    return addr


@dataclass(frozen=True)
class SmtpAccount:
    """One outbound mail account. The platform's comes from settings; a tenant's
    comes from its `users` row."""
    host: str
    port: int
    user: str
    password: str
    sender: str
    use_tls: bool


@dataclass(frozen=True)
class Brand:
    """What the recipient should see this mail as coming from."""
    name: str
    # None means "use the bundled platform logo". A tenant logo lives behind an
    # HTTP route rather than on disk, so it is not inlined as a CID attachment —
    # tenant mail simply goes out without the platform lockup rather than with
    # somebody else's.
    inline_logo: bool = True


def platform_smtp() -> Optional[SmtpAccount]:
    s = get_settings()
    host = str(s.SMTP_HOST or "").strip()
    if not host:
        return None
    sender = (s.SMTP_FROM or s.SMTP_USER or "").strip()
    if not sender:
        return None
    return SmtpAccount(
        host=host, port=int(s.SMTP_PORT), user=(s.SMTP_USER or "").strip(),
        password=(s.SMTP_PASSWORD or "").strip(), sender=sender,
        use_tls=bool(s.SMTP_USE_TLS),
    )


def tenant_smtp(owner) -> Optional[SmtpAccount]:
    """Build an account from a tenant row. Requires host AND from — a host with
    no sender address cannot produce a valid message."""
    host = (getattr(owner, "smtp_host", None) or "").strip()
    sender = (getattr(owner, "smtp_from", None) or "").strip()
    if not host or not sender:
        return None
    return SmtpAccount(
        host=host, port=int(getattr(owner, "smtp_port", None) or 587),
        user=(getattr(owner, "smtp_user", None) or "").strip(),
        password=(getattr(owner, "smtp_password", None) or "").strip(),
        sender=sender, use_tls=bool(getattr(owner, "smtp_tls", True)),
    )


async def smtp_for_user(user, db) -> Optional[SmtpAccount]:
    """Which account sends mail to this user.

    Staff and platform-pool clients use the platform account. A tenant's client
    uses that tenant's account and has NO platform fallback: if the tenant has
    not configured SMTP the mail is skipped, because sending a broker's client
    an email from another broker's address is worse than not sending it.
    """
    if not get_settings().BRANDING_ENABLED:
        return platform_smtp()

    owner = await _branding_owner(user, db)
    if owner is None or owner.id == getattr(user, "id", None):
        return platform_smtp()
    return tenant_smtp(owner)


async def brand_for_user(user, db) -> Brand:
    if not get_settings().BRANDING_ENABLED:
        return Brand(name=PLATFORM_BRAND_NAME)
    owner = await _branding_owner(user, db)
    if owner is None or not getattr(owner, "brand_name", None):
        return Brand(name=PLATFORM_BRAND_NAME)
    # A tenant-branded mail must not carry the platform lockup.
    return Brand(name=owner.brand_name, inline_logo=False)


async def _branding_owner(user, db):
    """The tenant row that owns this user's branding, or None for the platform.

    Imported lazily and defensively: mail must never fail because a branding
    lookup did.
    """
    try:
        role = getattr(user, "role", None)
        if role in ("sub_admin", "super_admin"):
            return user
        owner_id = getattr(user, "assigned_admin_id", None)
        if not owner_id:
            return None
        from sqlalchemy import select
        from .models import User as _User
        result = await db.execute(select(_User).where(_User.id == owner_id))
        return result.scalar_one_or_none()
    except Exception as e:  # pragma: no cover — never break mail on lookup
        logger.warning("branding owner lookup failed: %s", e)
        return None


def _send_sync(
    to_email: str,
    subject: str,
    html: str,
    text: Optional[str],
    account: "SmtpAccount",
    brand: Optional["Brand"] = None,
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = account.sender
    msg["To"] = to_email
    # Always include a plain-text fallback. If the caller didn't give us one,
    # produce a crude strip-tags version of the html so picky clients still
    # render something.
    plain = text if text else _strip_tags(html)
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")

    # Attach the brand logo as a related inline image so <img src="cid:..."/>
    # in the template renders without an outbound fetch. We modify the HTML
    # alternative part directly (not the outer message) so the structure is
    # multipart/alternative {plain, multipart/related {html, image}}.
    logo = _logo_bytes() if (brand is None or brand.inline_logo) else None
    if logo:
        html_part = msg.get_payload()[-1]
        html_part.add_related(
            logo,
            maintype="image",
            subtype="png",
            cid=f"<{_LOGO_CID}>",
            filename="tuskaex-logo.png",
        )

    host = account.host
    port = int(account.port)
    user = account.user
    pwd = account.password

    # Port 465 = implicit TLS (SMTPS) — needs SMTP_SSL which negotiates
    # TLS before the SMTP greeting. Port 587 = STARTTLS — connect plain,
    # then upgrade via STARTTLS. Using the wrong class on port 465 hangs
    # because the server waits for a TLS ClientHello while our client
    # waits for the plaintext '220' greeting.
    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=30) as server:
            if user:
                server.login(user, pwd)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            if account.use_tls:
                server.starttls()
            if user:
                server.login(user, pwd)
            server.send_message(msg)


async def send_email(
    to_email: str,
    subject: str,
    html: str,
    *,
    text: Optional[str] = None,
    smtp: Optional["SmtpAccount"] = None,
    brand: Optional["Brand"] = None,
) -> bool:
    """Send a transactional email. Returns True on success, False on
    misconfiguration or SMTP failure. Never raises — caller can ignore
    the result if they don't care.

    `smtp` selects the sending account. Omitted, it falls back to the platform
    account, which is exactly the behaviour every existing call site had before
    white-labelling existed. Callers that want tenant-aware sending resolve it
    with smtp_for_user() and pass it here; a None from that helper means the
    tenant has no mail account and the send must be SKIPPED, not fall back."""
    account = smtp if smtp is not None else platform_smtp()
    if account is None:
        logger.warning("SMTP not configured — skipping email to %s subj=%r", to_email, subject)
        return False
    if not to_email or "@" not in to_email:
        logger.warning("Skipping email — bad recipient %r", to_email)
        return False
    try:
        await asyncio.to_thread(_send_sync, to_email, subject, html, text, account, brand)
        logger.info("email sent to=%s subj=%r", to_email, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s subj=%r", to_email, subject)
        return False


def fire_and_forget(coro) -> None:
    """Schedule a send_email coroutine on the running loop without awaiting.
    Use from API handlers + services so SMTP latency never delays a response
    and a delivery failure never rolls back a transaction."""
    try:
        asyncio.create_task(coro)
    except RuntimeError:
        # No running loop (sync context) — best-effort fallback.
        try:
            asyncio.run(coro)
        except Exception:
            logger.exception("fire_and_forget fallback failed")


# ─── Plain-text fallback ────────────────────────────────────────────


def _strip_tags(html: str) -> str:
    import re
    # Remove block-level tags as line breaks first so the plaintext is readable.
    txt = re.sub(r"</(p|div|h[1-6]|li|tr)>", "\n", html, flags=re.IGNORECASE)
    txt = re.sub(r"<br\s*/?>", "\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", "", txt)
    # Collapse whitespace.
    txt = re.sub(r"\n\s*\n+", "\n\n", txt)
    return txt.strip()


# ─── Backwards-compat helper used by auth_service.forgot_password ───


async def send_password_reset_email(
    to_email: str, code: str, *, app_name: str = "TuskaEx",
) -> bool:
    from .email_templates import render_password_reset
    subject, html, text = render_password_reset(app_name=app_name, code=code)
    return await send_email(to_email, subject, html, text=text)
