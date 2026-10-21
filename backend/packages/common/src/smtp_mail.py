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
import dataclasses
import logging
import re
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path
from typing import Optional

from . import tenant_brand as _tenant_brand
from .config import get_settings

logger = logging.getLogger(__name__)

# Fallback sender name when no tenant brand applies. Mirrors BRAND_NAME in the
# two frontends; email_templates/base.py hard-codes the same word.
PLATFORM_BRAND_NAME = _tenant_brand.PLATFORM_BRAND_NAME

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
    # Tenant-only: where platform links and the platform support address are
    # rewritten to (see _rebrand). None = the tenant has no live domain / no
    # support address; the rewrite then keeps the URL / drops the sentence.
    site_url: Optional[str] = None
    admin_url: Optional[str] = None
    support_email: Optional[str] = None

    @property
    def is_platform(self) -> bool:
        return self.name == PLATFORM_BRAND_NAME


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


async def brand_for_user(user, db) -> Optional[Brand]:
    """What the recipient should see this mail as coming from.

    Mirrors smtp_for_user's rule, which it previously contradicted. That
    function refuses to fall back to the platform account for a tenant's
    client — better no mail than mail from another broker's address — but this
    one fell back to the platform NAME whenever a tenant had not set
    `brand_name`. A tenant with SMTP configured and no brand name therefore
    sent their own clients mail from their own address signed by the parent
    platform, which is the one combination worse than either extreme.

    So a tenant's client never sees the platform's name. Their brand name, else
    their domain, else the domain their own mail is sent from — all three are
    the tenant's own. The platform name is reached only by a platform-pool
    client or the platform's own staff.
    """
    if not get_settings().BRANDING_ENABLED:
        return Brand(name=PLATFORM_BRAND_NAME)
    owner = await _branding_owner(user, db)
    # No owner ⇒ platform pool; a super_admin owner ⇒ the platform itself.
    if owner is None or getattr(owner, "role", None) == "super_admin":
        return Brand(name=PLATFORM_BRAND_NAME)

    name = (getattr(owner, "brand_name", None) or "").strip()
    if not name:
        name = (getattr(owner, "custom_domain", None) or "").strip()
    if not name:
        # A tenant reaching this line has SMTP configured (smtp_for_user would
        # have skipped the mail otherwise), so smtp_from exists and its domain
        # is theirs.
        sender = (getattr(owner, "smtp_from", None) or "").strip()
        name = sender.split("@")[-1].strip() if "@" in sender else ""
    if not name:
        # Nothing of the tenant's to put on it. None means SKIP, exactly as a
        # None from smtp_for_user does — returning the platform brand here is
        # the bug this function was rewritten to remove.
        logger.warning(
            "tenant %s has no brand name, domain or sender domain — skipping "
            "mail rather than branding it as the platform",
            getattr(owner, "id", "?"),
        )
        return None
    # A tenant-branded mail must not carry the platform lockup.
    return tenant_brand_from_owner(owner, name=name)


def tenant_brand_from_owner(owner, *, name: Optional[str] = None) -> Optional[Brand]:
    """A tenant Brand carrying everything _rebrand needs (site URL, admin URL,
    support address). `name` defaults to brand_name, else custom_domain, else
    the domain of the tenant's own sender address; None when there is nothing
    of the tenant's to call it (⇒ skip the mail)."""
    if owner is None:
        return None
    if not name:
        name = _tenant_brand.display_name(owner)
    if not name:
        sender = (getattr(owner, "smtp_from", None) or "").strip()
        name = sender.split("@")[-1].strip() if "@" in sender else ""
    if not name:
        return None
    admin_url = None
    site = _tenant_brand.site_url(owner)
    admin_label = (getattr(owner, "admin_subdomain", None) or "").strip().lower().strip(".")
    if site and admin_label:
        domain = (getattr(owner, "custom_domain", None) or "").strip().lower().rstrip(".")
        admin_url = f"https://{admin_label}.{domain}"
    return Brand(
        name=name,
        inline_logo=False,
        site_url=site,
        admin_url=admin_url,
        support_email=(getattr(owner, "support_email", None) or "").strip() or None,
    )


async def _branding_owner(user, db):
    """The tenant row that owns this user's branding, or None for the platform.
    Never raises — mail must never fail because a branding lookup did."""
    return await _tenant_brand.branding_owner(user, db)


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
    # A broker's mail shows the broker's name as sender, even when it goes out
    # through the platform account.
    if brand is not None and not brand.is_platform and brand.name and "<" not in account.sender:
        from email.utils import formataddr
        msg["From"] = formataddr((brand.name, account.sender))
    else:
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
    tenant has no mail account and the send must be SKIPPED, not fall back.

    White-label safety net: when the caller passes neither `smtp` nor `brand`,
    the recipient is looked up by address. A broker's client (or the broker)
    gets the tenant's account and brand exactly as if the caller had resolved
    them — or nothing at all if the tenant cannot send. A platform recipient,
    an unknown address, a lookup failure, or BRANDING_ENABLED off all leave
    smtp/brand as None, i.e. byte-for-byte the pre-white-label send.

    Any non-platform brand (resolved here or passed explicitly) has the copy
    rewritten by _rebrand before sending."""
    tenant_mail_off = not get_settings().TENANT_EMAIL_ENABLED
    if tenant_mail_off and brand is not None and not brand.is_platform:
        logger.info("tenant email switched off — skipping email to %s subj=%r", to_email, subject)
        return False
    if smtp is None and brand is None:
        tenant = await _tenant_identity_for_recipient(to_email)
        if tenant is not None:
            if tenant_mail_off:
                logger.info("tenant email switched off — skipping email to %s subj=%r", to_email, subject)
                return False
            smtp, brand = tenant
            if brand is None:
                logger.warning(
                    "tenant recipient %s has no brand name or domain — skipping email subj=%r",
                    to_email, subject,
                )
                return False
            # smtp None = the broker has no mail account of their own. Their
            # clients still need OTPs and password resets, so the platform
            # account sends it — rebranded below, with their name as sender.
    if brand is not None and not brand.is_platform:
        subject, html, text = _rebrand(subject, html, text, brand)
        # Never attach the platform lockup to tenant-branded mail.
        brand = dataclasses.replace(brand, inline_logo=False)
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


async def _tenant_identity_for_recipient(
    to_email: str,
) -> Optional[tuple[Optional["SmtpAccount"], Optional["Brand"]]]:
    """(account, brand) for a recipient who belongs to a white-label tenant,
    else None (platform user, unknown address, flag off, or ANY error — the
    caller then sends exactly as it always did). Inside the tuple, a None
    means the tenant cannot send / has no name ⇒ skip."""
    if not get_settings().BRANDING_ENABLED:
        return None
    addr = (to_email or "").strip().lower()
    if not addr or "@" not in addr:
        return None
    try:
        from sqlalchemy import func, select
        from .database import AsyncSessionLocal
        from .models import User as _User

        async with AsyncSessionLocal() as db:
            user = (
                await db.execute(
                    select(_User).where(func.lower(_User.email) == addr).limit(1)
                )
            ).scalars().first()
            if user is None:
                return None
            if await _tenant_brand.tenant_owner_for(user, db) is None:
                return None
            return await smtp_for_user(user, db), await brand_for_user(user, db)
    except Exception as e:
        logger.warning("recipient branding lookup failed for %s: %s", to_email, e)
        return None


# ─── Tenant rebranding of rendered mail ────────────────────────────

# Every address on the platform's domain (support@, noreply@, …).
_PLATFORM_ADDR = r"[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)*(?:tuskaex\.com|speedtrade\.tech)"
_PLATFORM_ADDR_RE = re.compile(_PLATFORM_ADDR)
_NAME_RE = re.compile(r"SpeedTrader|SpeedTrade|Speedtrade|SPEEDTRADE|TuskaEx|Tuskaex|TUSKAEX")
# Platform marketing line in the base.py footer — meaningless under a broker's name.
_TAGLINE_RE = re.compile(
    r"TuskaEx\s+—\s+Trade without giving your money to any broker\.\s*<br\s*/?>\s*"
)
# base.py footer: "Need help? Reply to this email or contact <a mailto>addr</a>."
_FOOTER_CONTACT_RE = re.compile(
    r"Reply to this email or contact\s*<a\b[^>]*href=\"mailto:" + _PLATFORM_ADDR
    + r"\"[^>]*>.*?</a>\s*\.", re.S,
)
# A CTA button (render_layout cta_block) whose target is a platform mailbox.
_MAILTO_CTA_RE = re.compile(
    r"<div\b[^>]*>\s*<a\b[^>]*href=\"mailto:" + _PLATFORM_ADDR + r"\"[^>]*>.*?</a>\s*</div>",
    re.S,
)
_MAILTO_LINK_RE = re.compile(
    r"<a\b[^>]*href=\"mailto:" + _PLATFORM_ADDR + r"\"[^>]*>(.*?)</a>", re.S,
)
_ADDR_PHRASE_RE = re.compile(r"\b(Email|email|Contact|contact)\s+" + _PLATFORM_ADDR)
_CID_IMG_RE = re.compile(r"<img\b[^>]*src=\"cid:[^\"]*\"[^>]*>", re.I)


def _platform_url_map(brand: "Brand") -> list[tuple[str, str]]:
    """(platform base URL, tenant base URL) pairs, longest first so
    https://trade.tuskaex.com is rewritten before https://tuskaex.com could
    match a shorter form. Pairs with no tenant target are omitted, i.e. the
    platform URL is kept when the tenant has no live domain."""
    s = get_settings()
    pairs: dict[str, Optional[str]] = {}
    for u in (
        s.TRADER_APP_URL, getattr(s, "BRANDING_PUBLIC_BASE_URL", ""),
        "https://trade.tuskaex.com", "https://www.tuskaex.com", "https://tuskaex.com",
        "https://trade.speedtrade.tech", "https://www.speedtrade.tech", "https://speedtrade.tech",
    ):
        u = (u or "").strip().rstrip("/")
        if u:
            pairs[u] = brand.site_url
    for u in (getattr(s, "ADMIN_APP_URL", ""), "https://admin.tuskaex.com"):
        u = (u or "").strip().rstrip("/")
        if u:
            pairs[u] = brand.admin_url or brand.site_url
    return sorted(
        ((k, v) for k, v in pairs.items() if v), key=lambda kv: len(kv[0]), reverse=True,
    )


def _rebrand_text(value: str, brand: "Brand", *, is_html: bool) -> str:
    from html import escape as _esc

    def lit(v: str) -> str:
        return _esc(v, quote=True) if is_html else v

    out = value
    if is_html:
        # Platform lockup → the tenant's name as a text wordmark.
        out = _CID_IMG_RE.sub(
            lambda _m: (
                '<span style="font-size:20px;font-weight:700;color:#f5f5f5;">'
                + lit(brand.name) + "</span>"
            ),
            out,
        )
        out = _TAGLINE_RE.sub("", out)

    # Support address: the tenant's, or drop the sentence / link.
    if brand.support_email:
        out = _PLATFORM_ADDR_RE.sub(lambda _m: lit(brand.support_email), out)
    else:
        if is_html:
            out = _FOOTER_CONTACT_RE.sub("Reply to this email.", out)
            out = _MAILTO_CTA_RE.sub("", out)
            out = _MAILTO_LINK_RE.sub(lambda m: m.group(1), out)
        out = _ADDR_PHRASE_RE.sub(
            lambda m: ("Contact" if m.group(1)[0].isupper() else "contact") + " support",
            out,
        )
        out = _PLATFORM_ADDR_RE.sub("support", out)

    # Platform links → the tenant's live site (kept as-is when there is none).
    for platform_url, tenant_url in _platform_url_map(brand):
        out = out.replace(platform_url, lit(tenant_url))

    # Finally the name itself.
    out = _NAME_RE.sub(lambda _m: lit(brand.name), out)
    return out


def _rebrand(
    subject: str, html: str, text: Optional[str], brand: "Brand",
) -> tuple[str, str, Optional[str]]:
    """Rewrite a rendered platform email so a tenant's recipient sees only the
    tenant: name, links, support address, and no platform logo. Only ever
    called for a non-platform Brand. Never raises — on an unexpected error the
    name swap alone is applied, which still never shows the platform's name."""
    try:
        return (
            _rebrand_text(subject or "", brand, is_html=False),
            _rebrand_text(html or "", brand, is_html=True),
            _rebrand_text(text, brand, is_html=False) if text else text,
        )
    except Exception:  # pragma: no cover
        logger.exception("email rebrand failed; applying name swap only")

        def sub(v):
            return _NAME_RE.sub(lambda _m: brand.name, v) if v else v
        return sub(subject), sub(html), sub(text)


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
    to_email: str, code: str, *, app_name: str = PLATFORM_BRAND_NAME,
    smtp: Optional["SmtpAccount"] = None, brand: Optional["Brand"] = None,
) -> bool:
    """Rendered with the platform name and sent through send_email, so a
    tenant recipient is resolved and rebranded there like every other mail."""
    from .email_templates import render_password_reset
    subject, html, text = render_password_reset(app_name=app_name, code=code)
    return await send_email(to_email, subject, html, text=text, smtp=smtp, brand=brand)
