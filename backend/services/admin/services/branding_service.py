"""White-label branding — logo storage, tenant profile, per-tenant SMTP config.

Gated by settings.BRANDING_ENABLED. With the flag off every route here answers
503 and nothing else in the platform reads these columns.

Storage follows banner_service exactly: an env-configured directory, a
uuid4 filename (never the client's), path-safety on the way back out, and a
FileResponse route — this repo mounts no StaticFiles anywhere. The one
difference is that uploads also go through file_validation.validate_upload,
which sniffs magic bytes; banners only check the declared Content-Type, and a
JPEG-header polyglot would otherwise be hostable from our origin.
"""
import asyncio
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src import tenant_hosts as _tenant_hosts
from packages.common.src.config import get_settings
from packages.common.src.file_validation import validate_upload
from packages.common.src.models import User
from packages.common.src.path_safety import PathTraversalError, safe_join_under_base

logger = logging.getLogger("admin.branding_service")

MEDIA_PATH_PREFIX = "/api/v1/admin/branding/media"
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp"}
MAX_LOGO_BYTES = 2 * 1024 * 1024

# Roles that own a brand. A client never does — it inherits from its tenant.
BRAND_OWNER_ROLES = ("sub_admin", "super_admin")

# Custom-domain lifecycle. Module-level strings rather than an enum so a new
# state needs no migration — the column is a plain VARCHAR.
STATUS_PENDING_DNS = "PENDING_DNS"
STATUS_DNS_VERIFIED = "DNS_VERIFIED"
STATUS_PROVISIONING = "PROVISIONING"
STATUS_READY = "READY"
STATUS_FAILED = "FAILED"

# Labels a tenant may not use for their app or admin host: they collide with
# hosts we serve ourselves, or with paths the apps already own.
RESERVED_LABELS = {"www", "api", "admin", "static", "uploads", "cdn", "mail"}

_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)
_LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")


def _upload_dir() -> Path:
    # Must never raise — this module is imported at startup, so anything that
    # throws here takes the whole admin API down. That includes working out the
    # fallback path: in the container this file sits at /app/services/, which
    # has fewer parents than a source checkout, and an over-deep parents[] index
    # is an IndexError long before any filesystem call happens.
    env = os.environ.get("BRANDING_UPLOAD_DIR", "").strip()
    if env:
        p = Path(env)
    else:
        here = Path(__file__).resolve()
        root = next(
            (a for a in here.parents if (a / "uploads").is_dir()),
            here.parent,
        )
        p = root / "uploads" / "branding"
    try:
        p.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        logger.warning(
            "Branding upload dir %s is not usable (%s). Logo upload/serve will "
            "fail until it is writable; the rest of the admin API is unaffected.",
            p, e,
        )
    return p


UPLOAD_DIR = _upload_dir()


def _ensure_writable() -> Path:
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        logger.error("Branding upload dir %s unusable: %s", UPLOAD_DIR, e)
        raise HTTPException(
            status_code=500,
            detail="Branding storage is not writable on the server.",
        )
    return UPLOAD_DIR


def assert_enabled() -> None:
    """503 rather than 404 — the routes exist, the feature is switched off."""
    if not get_settings().BRANDING_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="White-label branding is not enabled on this platform.",
        )


def assert_brand_owner(admin: User) -> None:
    if admin.role not in BRAND_OWNER_ROLES:
        raise HTTPException(
            status_code=403, detail="Only tenants and super admins own a brand"
        )


# ─── Read ────────────────────────────────────────────────────────────────

def to_profile(row: User) -> dict:
    """The tenant's own view. Includes SMTP host/user/from so the form can show
    what is configured, and a boolean for the password — never the password."""
    return {
        "id": str(row.id),
        "email": row.email,
        "brand_name": row.brand_name,
        "logo_url": row.logo_url,
        "support_email": row.support_email,
        "support_whatsapp": row.support_whatsapp,
        "smtp_host": row.smtp_host,
        "smtp_port": row.smtp_port,
        "smtp_user": row.smtp_user,
        "smtp_from": row.smtp_from,
        "smtp_tls": bool(row.smtp_tls),
        "smtp_password_set": bool(row.smtp_password),
        "smtp_configured": bool(row.smtp_host and row.smtp_from),
    }


async def get_my_branding(*, admin: User, db: AsyncSession) -> dict:
    assert_enabled()
    assert_brand_owner(admin)
    out = to_profile(admin)
    code = await ensure_public_code(admin, db)
    out["public_code"] = code
    out["referral_link"] = referral_link(code)
    out["domain"] = domain_payload(admin)
    return out


async def resolve_branding_owner(user: User, db: AsyncSession) -> User | None:
    """Which row carries the brand for this user.

    A tenant owns its own; a client inherits from `assigned_admin_id`. Returns
    None for a platform-pool client, which means "no branding" — the caller
    falls back to the platform defaults.
    """
    if user.role in BRAND_OWNER_ROLES:
        return user
    if not user.assigned_admin_id:
        return None
    result = await db.execute(select(User).where(User.id == user.assigned_admin_id))
    return result.scalar_one_or_none()


def to_public_payload(owner: User | None) -> dict:
    """What an unauthenticated caller may see. No SMTP, no email, no ids."""
    if owner is None:
        return {"brand_name": None, "logo_url": None,
                "support_email": None, "support_whatsapp": None}
    return {
        "brand_name": owner.brand_name,
        "logo_url": owner.logo_url,
        "support_email": owner.support_email,
        "support_whatsapp": owner.support_whatsapp,
    }


# ─── Write ───────────────────────────────────────────────────────────────

async def update_branding(
    *, admin: User, brand_name: str | None, support_email: str | None,
    support_whatsapp: str | None, db: AsyncSession,
) -> dict:
    assert_enabled()
    assert_brand_owner(admin)

    # Empty string clears; None (field absent) leaves the value alone.
    if brand_name is not None:
        admin.brand_name = brand_name.strip() or None
    if support_email is not None:
        admin.support_email = support_email.strip() or None
    if support_whatsapp is not None:
        admin.support_whatsapp = support_whatsapp.strip() or None

    await db.commit()
    return to_profile(admin)


async def upload_logo(*, admin: User, file: UploadFile, db: AsyncSession) -> dict:
    assert_enabled()
    assert_brand_owner(admin)

    raw = await file.read()
    if len(raw) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail="Logo must be 2 MB or smaller")

    declared = Path(file.filename or "").suffix.lower()
    try:
        # Sniffs magic bytes and returns the canonical extension; raises if the
        # declared extension is a lie or the type is not allowed.
        ext = validate_upload(
            raw, declared, allowed_extensions=ALLOWED_EXT, label="logo",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # validate_upload returns the canonical extension including the dot.
    out_name = f"{uuid.uuid4().hex}{ext}"
    (_ensure_writable() / out_name).write_bytes(raw)

    previous = admin.logo_url
    admin.logo_url = f"{MEDIA_PATH_PREFIX}/{out_name}"
    await db.commit()

    # Drop the superseded file. Best-effort: a stale logo on disk is harmless,
    # a failed request because cleanup threw is not.
    if previous:
        try:
            old = Path(previous).name
            if old and old != out_name:
                (UPLOAD_DIR / old).unlink(missing_ok=True)
        except OSError as e:
            logger.warning("Could not remove superseded logo %s: %s", previous, e)

    return to_profile(admin)


async def update_smtp(
    *, admin: User, host: str | None, port: int | None, user: str | None,
    password: str | None, sender: str | None, tls: bool | None, db: AsyncSession,
) -> dict:
    """Write the tenant's own SMTP account.

    Refused for super_admin: the platform's own SMTP belongs in the environment,
    not in a database row an admin screen can edit.
    """
    assert_enabled()
    assert_brand_owner(admin)
    if admin.role == "super_admin":
        raise HTTPException(
            status_code=400,
            detail="Platform SMTP is configured through the environment, not here.",
        )

    if host is not None:
        admin.smtp_host = host.strip() or None
    if port is not None:
        admin.smtp_port = port or None
    if user is not None:
        admin.smtp_user = user.strip() or None
    if sender is not None:
        admin.smtp_from = sender.strip() or None
    if tls is not None:
        admin.smtp_tls = bool(tls)
    # An absent password keeps the stored one; an empty string clears it.
    if password is not None:
        admin.smtp_password = password or None

    await db.commit()
    return to_profile(admin)


# ─── Referral code ───────────────────────────────────────────────────────

async def ensure_public_code(owner: User, db: AsyncSession) -> str:
    """A tenant's shareable code, minted on first use.

    Format mirrors generate_account_number() in the gateway (`PT########`) so
    the two read as a family. Retries on collision rather than trusting
    randomness — the unique index is the real guarantee, this just avoids
    surfacing an IntegrityError to the operator.
    """
    if owner.public_code:
        return owner.public_code
    for _ in range(8):
        code = f"ADM{secrets.randbelow(90000000) + 10000000}"
        clash = (await db.execute(
            select(User.id).where(User.public_code == code)
        )).scalar_one_or_none()
        if clash is None:
            owner.public_code = code
            await db.commit()
            return code
    raise HTTPException(status_code=500, detail="Could not allocate a referral code")


def referral_link(code: str) -> str:
    s = get_settings()
    base = (s.BRANDING_PUBLIC_BASE_URL or s.TRADER_APP_URL or "").rstrip("/")
    return f"{base}/auth/register?ref={code}" if base else f"/auth/register?ref={code}"


# ─── Custom domain ───────────────────────────────────────────────────────

def normalise_domain(raw: str) -> str:
    """Accept what a person actually pastes and reduce it to a bare apex.

    Operators paste 'https://Broker.com/', 'www.broker.com', 'broker.com:443'.
    Rejecting those outright is unhelpful when the intent is unambiguous.
    """
    d = (raw or "").strip().lower()
    d = re.sub(r"^[a-z]+://", "", d)      # scheme
    d = d.split("/")[0].split("?")[0]      # path / query
    d = d.split(":")[0]                    # port
    d = d.rstrip(".")                      # trailing root dot
    if d.startswith("www."):
        d = d[4:]
    if not d or not _DOMAIN_RE.match(d):
        raise HTTPException(
            status_code=400,
            detail="Enter an apex domain like broker.com — no https://, no www, no path.",
        )
    return d


def normalise_label(raw: str, *, for_admin_panel: bool = False) -> str | None:
    label = (raw or "").strip().lower().strip(".")
    if not label:
        return None
    if "." in label:
        raise HTTPException(
            status_code=400, detail="Use a single label, e.g. 'app' — not 'app.broker.com'."
        )
    if not _LABEL_RE.match(label):
        raise HTTPException(status_code=400, detail=f"'{label}' is not a valid hostname label.")
    reserved = RESERVED_LABELS - ({"admin"} if for_admin_panel else set())
    if label in reserved:
        raise HTTPException(status_code=400, detail=f"'{label}' is reserved.")
    return label


def hostnames_for(domain: str, app_subdomain: str | None,
                  admin_subdomain: str | None) -> list[str]:
    """Every hostname we will answer on for this tenant.

    Delegates to packages.common so the set the CORS layer allows, the set the
    cookie scope covers, and the set the operator is told to serve all come from
    one definition. When these drifted, the symptom was a tenant reporting that
    one of their hosts 403s while another works — with nothing in any log.
    """
    return _tenant_hosts.hostnames_for(domain, app_subdomain, admin_subdomain)


def _resolver():
    import dns.resolver
    # configure=False ignores the container's /etc/resolv.conf. A tenant who
    # just fixed their DNS should not be told it is still wrong because a local
    # cache is holding the old answer for another hour.
    r = dns.resolver.Resolver(configure=False)
    r.nameservers = ["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]
    r.timeout = 5
    r.lifetime = 5
    return r


def _lookup_a(host: str) -> dict:
    import dns.resolver
    try:
        answers = _resolver().resolve(host, "A")
        return {"host": host, "ips": sorted(a.address for a in answers), "error": None}
    except dns.resolver.NXDOMAIN:
        return {"host": host, "ips": [], "error": "No DNS record exists for this host yet."}
    except dns.resolver.NoAnswer:
        return {"host": host, "ips": [], "error": "The host exists but has no A record."}
    except Exception as e:
        return {"host": host, "ips": [], "error": f"Lookup failed: {e}"}


async def check_dns(domain: str, app_subdomain: str | None,
                    admin_subdomain: str | None) -> dict:
    """Resolve every hostname this tenant needs and compare against our IP."""
    ip = (get_settings().PLATFORM_PUBLIC_IP or "").strip()
    hosts = hostnames_for(domain, app_subdomain, admin_subdomain)
    # dnspython is blocking; four lookups at 5s each would stall the worker.
    results = await asyncio.gather(*(asyncio.to_thread(_lookup_a, h) for h in hosts))
    for r in results:
        r["matched"] = bool(ip) and ip in r["ips"]
    return {
        "platform_ip": ip,
        "records": results,
        "all_matched": bool(ip) and all(r["matched"] for r in results),
    }


def dns_instructions(domain: str, app_subdomain: str | None,
                     admin_subdomain: str | None) -> list[dict]:
    """The rows a tenant copies into their registrar."""
    ip = (get_settings().PLATFORM_PUBLIC_IP or "").strip()
    rows = ([{"type": "A", "host": app_subdomain, "value": ip}]
            if app_subdomain else
            [{"type": "A", "host": "@", "value": ip},
             {"type": "A", "host": "www", "value": ip}])
    if admin_subdomain:
        rows.append({"type": "A", "host": admin_subdomain, "value": ip})
    return rows


def domain_payload(owner: User) -> dict:
    hosts = (hostnames_for(owner.custom_domain, owner.app_subdomain, owner.admin_subdomain)
             if owner.custom_domain else [])
    return {
        "custom_domain": owner.custom_domain,
        "app_subdomain": owner.app_subdomain,
        "admin_subdomain": owner.admin_subdomain,
        # Whether THIS row may hold a domain. Mirrors the super_admin refusal in
        # connect_domain, derived from the same condition rather than re-deriving
        # the role client-side. False means the UI must ask which tenant the
        # domain is for instead of connecting it to the caller — a domain on the
        # platform owner's row sends every signup on it to the platform pool.
        "connectable": owner.role != "super_admin",
        "mode": "subdomain" if owner.app_subdomain else ("apex" if owner.custom_domain else None),
        "status": owner.custom_domain_status,
        "last_error": owner.custom_domain_last_error,
        "provisioned_at": (owner.custom_domain_provisioned_at.isoformat()
                           if owner.custom_domain_provisioned_at else None),
        "served_hostnames": hosts,
        "platform_ip": (get_settings().PLATFORM_PUBLIC_IP or "").strip(),
        "dns_records": (dns_instructions(owner.custom_domain, owner.app_subdomain,
                                         owner.admin_subdomain)
                        if owner.custom_domain else []),
        "app_url": (f"https://{hosts[0]}" if hosts else None),
        "admin_url": (f"https://{owner.admin_subdomain}.{owner.custom_domain}"
                      if owner.admin_subdomain and owner.custom_domain else None),
    }


async def connect_domain(
    *, admin: User, domain: str, app_subdomain: str | None,
    admin_subdomain: str | None, db: AsyncSession,
) -> dict:
    assert_enabled()
    assert_brand_owner(admin)

    # A super-admin holding a custom domain is always a misconfiguration, and a
    # silent one. tenant_resolver._pool_id maps a super_admin owner to the
    # PLATFORM pool — that is what a NULL assigned_admin_id means — so every
    # signup on the domain lands in the platform's own book while the tenant's
    # logo, favicon and copy render perfectly. Nothing errors, nothing logs, and
    # the tenant's Users page just stays empty. It reads as broken attribution
    # and is actually the domain sitting on the wrong row.
    #
    # The platform's own hostnames come from the environment, never from this
    # column, so there is no case where a super-admin needs one.
    if admin.role == "super_admin":
        raise HTTPException(
            status_code=400,
            detail=(
                "A custom domain belongs to a sub-admin, not to the platform "
                "owner — signups on it would land in the platform pool and the "
                "tenant's Users page would stay empty. Assign it from "
                "Sub-admins → (the tenant) → White-label domain."
            ),
        )

    if not (get_settings().PLATFORM_PUBLIC_IP or "").strip():
        raise HTTPException(
            status_code=503,
            detail="PLATFORM_PUBLIC_IP is not set on the platform, so DNS "
                   "instructions cannot be produced. Ask the platform owner.",
        )
    # Changing mode mid-flight would leave nginx serving hostnames nobody asked
    # for. Disconnect is the way to switch.
    if admin.custom_domain:
        raise HTTPException(
            status_code=400,
            detail="A domain is already connected. Disconnect it first.",
        )

    d = normalise_domain(domain)
    app_label = normalise_label(app_subdomain) if app_subdomain else None
    admin_label = (normalise_label(admin_subdomain, for_admin_panel=True)
                   if admin_subdomain else None)
    if app_label and admin_label and app_label == admin_label:
        raise HTTPException(status_code=400,
                            detail="The app and admin hosts must differ.")

    taken = (await db.execute(
        select(User.id).where(User.custom_domain == d, User.id != admin.id)
    )).scalar_one_or_none()
    if taken is not None:
        raise HTTPException(status_code=409, detail="That domain is already connected.")

    admin.custom_domain = d
    admin.app_subdomain = app_label
    admin.admin_subdomain = admin_label
    admin.custom_domain_status = STATUS_PENDING_DNS
    admin.custom_domain_last_error = None
    admin.custom_domain_provisioned_at = None
    await db.commit()

    out = domain_payload(admin)
    out["dns_check"] = await check_dns(d, app_label, admin_label)
    return out


async def verify_domain(*, admin: User, db: AsyncSession) -> dict:
    """Re-resolve. On success the domain is ready for the operator to serve.

    This does NOT issue a certificate. Every nginx block on this platform uses a
    Cloudflare Origin certificate covering *.tuskaex.com, which cannot cover a
    customer's own apex, and certbot is not installed. Provisioning is therefore
    an explicit operator step (deploy/scripts/connect-tenant-domain.sh) and the
    status only advances to READY once that has run.
    """
    assert_enabled()
    assert_brand_owner(admin)
    if not admin.custom_domain:
        raise HTTPException(status_code=400, detail="No domain connected.")

    was_live = admin.custom_domain_status == STATUS_READY
    result = await check_dns(admin.custom_domain, admin.app_subdomain, admin.admin_subdomain)
    if result["all_matched"]:
        # READY is further along than DNS_VERIFIED; a passing re-check is no
        # reason to walk a live domain backwards.
        if not was_live:
            admin.custom_domain_status = STATUS_DNS_VERIFIED
        admin.custom_domain_last_error = None
    else:
        bad = [r for r in result["records"] if not r["matched"]]
        detail = "; ".join(
            f"{r['host']}: {r['error'] or ('points to ' + ', '.join(r['ips']) if r['ips'] else 'no A record')}"
            for r in bad
        )
        if was_live:
            # NEVER downgrade a domain we are already serving. This check
            # cannot succeed for a tenant behind Cloudflare — connect-tenant-
            # domain.sh requires the A records to be PROXIED, so they resolve
            # to Cloudflare's IPs and never to PLATFORM_PUBLIC_IP. Downgrading
            # on that basis took a working white-label site down: status left
            # READY means find_by_domain stops matching, the branding API
            # returns nulls, and the tenant's logo and favicon vanish while
            # the site keeps serving. Record what the lookup saw and leave the
            # status alone.
            admin.custom_domain_last_error = (
                f"{detail} — status left READY because the site is already being "
                f"served. A proxied (orange-cloud) Cloudflare record resolves to "
                f"Cloudflare, not to this platform's IP, so this check cannot pass "
                f"for that setup."
            )
        else:
            admin.custom_domain_status = STATUS_PENDING_DNS
            admin.custom_domain_last_error = detail
    await db.commit()

    out = domain_payload(admin)
    out["dns_check"] = result
    return out


async def mark_provisioned(*, admin: User, db: AsyncSession, ok: bool,
                           error: str | None = None) -> dict:
    """Flip to READY (or FAILED) once the operator has served the hostnames.

    Separate from verify_domain because DNS pointing at us and nginx actually
    answering on TLS are two different facts, and a tenant should not be told
    their site is live because a DNS record resolved.
    """
    assert_enabled()
    if not admin.custom_domain:
        raise HTTPException(status_code=400, detail="No domain connected.")
    if ok:
        admin.custom_domain_status = STATUS_READY
        admin.custom_domain_last_error = None
        admin.custom_domain_provisioned_at = datetime.now(timezone.utc)
    else:
        admin.custom_domain_status = STATUS_FAILED
        admin.custom_domain_last_error = error or "Provisioning failed."
    await db.commit()
    # The tenant-host snapshot drives CORS and cookie scope. Without this the
    # operator marks a domain live and it keeps being refused for up to the
    # cache TTL — which reads exactly like the provisioning step not working.
    _tenant_hosts.invalidate()
    return domain_payload(admin)


async def disconnect_domain(*, admin: User, db: AsyncSession) -> dict:
    assert_enabled()
    assert_brand_owner(admin)
    admin.custom_domain = None
    admin.app_subdomain = None
    admin.admin_subdomain = None
    admin.custom_domain_status = None
    admin.custom_domain_last_error = None
    admin.custom_domain_provisioned_at = None
    await db.commit()
    # Drop the host from the snapshot now rather than leaving a disconnected
    # domain able to pass CORS and capture signups for another minute.
    _tenant_hosts.invalidate()
    return domain_payload(admin)


# ─── Public lookup (unauthenticated) ─────────────────────────────────────

async def find_by_code(code: str, db: AsyncSession) -> User | None:
    if not code:
        return None
    return (await db.execute(
        select(User).where(User.public_code == code.strip().upper())
    )).scalar_one_or_none()


async def find_by_domain(host: str, db: AsyncSession) -> User | None:
    """Resolve a request Host to the tenant that owns it.

    Only READY domains match. A tenant that has connected a domain but whose
    hostnames we are not serving yet must not start capturing signups — the
    visitor would be looking at the platform's own site.
    """
    h = (host or "").strip().lower().split(":")[0]
    if not h:
        return None
    candidates = {h}
    if h.startswith("www."):
        candidates.add(h[4:])
    parts = h.split(".")
    if len(parts) > 2:
        candidates.add(".".join(parts[1:]))   # app.broker.com -> broker.com

    rows = (await db.execute(
        select(User).where(
            User.custom_domain.in_(candidates),
            User.custom_domain_status == STATUS_READY,
        )
    )).scalars().all()
    for row in rows:
        if h in hostnames_for(row.custom_domain, row.app_subdomain, row.admin_subdomain):
            return row
    return None


# ─── Media ───────────────────────────────────────────────────────────────

def serve_logo(filename: str) -> FileResponse:
    # Not gated by BRANDING_ENABLED: a logo already handed to a browser should
    # keep loading if the flag is toggled off mid-session.
    name = Path(filename or "").name
    if not name or name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    try:
        path = safe_join_under_base(UPLOAD_DIR, name)
    except PathTraversalError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)
