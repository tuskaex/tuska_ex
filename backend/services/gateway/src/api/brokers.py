"""Public broker lookup for the single multi-broker mobile app.

One app serves every white-label broker. A client picks their broker by its
shareable code (the same `public_code` used by `?ref=` links), the app shows
that broker's name and logo, and signup carries the code so the new user lands
in that broker's pool via `tenant_resolver.resolve_signup_owner`.

The admin service already exposes branding, but only under /api/v1/admin,
which is not routed on the API host the app talks to. The gateway shares the
same uploads volume, so it serves the logo file itself.
"""
from pathlib import Path
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import get_current_user
from packages.common.src.database import get_db
from packages.common.src.models import User
from packages.common.src.path_safety import PathTraversalError, safe_join_under_base
from packages.common.src.rate_limit import rate_limit_http
from ..services.tenant_resolver import find_owner_by_code

router = APIRouter()

MEDIA_PREFIX = "/api/v1/public/broker-media"
_ADMIN_MEDIA_PREFIX = "/api/v1/admin/branding/media/"
_INACTIVE = {"suspended", "banned", "blocked", "disabled", "inactive", "deleted"}

# Client-facing features a super-admin can switch off per broker
# (users.client_features). Absent key = enabled. Mirrored in the app's
# BrandState.features and the admin panel's broker page.
CLIENT_FEATURES = ("deposits", "withdrawals", "transfers", "copy_trading", "ib_program")


def client_features(owner: User | None) -> dict[str, bool]:
    raw = getattr(owner, "client_features", None) if owner is not None else None
    raw = raw if isinstance(raw, dict) else {}
    return {f: raw.get(f) is not False for f in CLIENT_FEATURES}


def _upload_dir() -> Path:
    env = os.environ.get("BRANDING_UPLOAD_DIR", "").strip()
    return Path(env) if env else Path("/app/uploads/branding")


def _logo_path(logo_url: str | None) -> str | None:
    """Rewrite the admin-service media path to the one served here."""
    if not logo_url:
        return None
    if logo_url.startswith(_ADMIN_MEDIA_PREFIX):
        return f"{MEDIA_PREFIX}/{logo_url[len(_ADMIN_MEDIA_PREFIX):]}"
    if logo_url.startswith(("http://", "https://")):
        return logo_url
    return None


def broker_payload(owner: User | None) -> dict | None:
    """What the app may show about a broker. No ids, no SMTP, no owner email."""
    if owner is None or owner.role != "sub_admin":
        return None
    if (owner.status or "").lower() in _INACTIVE:
        return None
    return {
        "code": (owner.public_code or "").upper() or None,
        "brand_name": owner.brand_name,
        "logo_url": _logo_path(owner.logo_url),
        "support_email": owner.support_email,
        "support_whatsapp": owner.support_whatsapp,
        "brand_color": getattr(owner, "brand_color", None),
        "features": client_features(owner),
    }


async def with_logo_fallback(payload: dict | None, db: AsyncSession) -> dict | None:
    """Fill a broker without a logo with the Platform brand logo.

    Mirrors the admin service's tenant_public_payload: the platform owner asked
    that a broker who has not uploaded a logo shows the one set on Admin →
    Platform brand, rather than the app falling back to the TuskaEx mark. A
    broker's own logo always wins.
    """
    if payload is None or payload.get("logo_url"):
        return payload
    rows = (
        await db.execute(
            select(User).where(User.role == "super_admin", User.logo_url.isnot(None))
        )
    ).scalars().all()
    if rows:
        newest = max(rows, key=lambda r: (r.updated_at or r.created_at).timestamp()
                     if (r.updated_at or r.created_at) else 0.0)
        payload["logo_url"] = _logo_path(newest.logo_url)
    return payload


@router.get("/brokers")
async def list_brokers(request: Request, db: AsyncSession = Depends(get_db)):
    """Every active broker, for the app's "choose your broker" list.

    Name, code, logo and colour only — the same fields any of their clients
    already sees. Brokers without a brand name are listed by their code.
    """
    rate_limit_http(request, "broker-list", 30, 60.0)
    rows = (
        await db.execute(
            select(User).where(User.role == "sub_admin", User.public_code.isnot(None))
        )
    ).scalars().all()
    items = []
    for owner in rows:
        p = await with_logo_fallback(broker_payload(owner), db)
        if p and p["code"]:
            items.append({k: p[k] for k in ("code", "brand_name", "logo_url", "brand_color")})
    items.sort(key=lambda b: (b["brand_name"] or b["code"]).lower())
    return {"items": items}


@router.get("/broker/{code}")
async def lookup_broker(code: str, request: Request, db: AsyncSession = Depends(get_db)):
    # Codes are short and guessable by design; the cap stops enumeration.
    rate_limit_http(request, "broker-lookup", 30, 60.0)
    c = (code or "").strip().upper()
    if not c or len(c) > 20 or not c.isalnum():
        raise HTTPException(status_code=404, detail="Broker not found")
    payload = await with_logo_fallback(broker_payload(await find_owner_by_code(c, db)), db)
    if payload is None:
        raise HTTPException(status_code=404, detail="Broker not found")
    return payload


@router.get("/broker-media/{filename}")
async def broker_media(filename: str):
    name = Path(filename or "").name
    if not name or name != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    try:
        path = safe_join_under_base(_upload_dir(), name)
    except PathTraversalError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=3600"})


def require_client_feature(feature: str):
    """Route dependency: 403 when the caller's broker switched `feature` off.

    The app hides switched-off features, but hiding is not enforcement — this
    is. Platform-pool users (no broker) and staff are never blocked, and a
    lookup failure fails open so a DB hiccup cannot take wallets down.
    """
    assert feature in CLIENT_FEATURES, feature

    async def _check(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        try:
            owner_id = (
                await db.execute(select(User.assigned_admin_id).where(User.id == current_user["user_id"]))
            ).scalar_one_or_none()
            if not owner_id:
                return
            raw = (
                await db.execute(select(User).where(User.id == owner_id))
            ).scalar_one_or_none()
            allowed = client_features(raw).get(feature, True)
        except Exception:
            return
        if not allowed:
            raise HTTPException(
                status_code=403,
                detail=f"{feature.replace('_', ' ').capitalize()} is not available for your account. Please contact your broker.",
            )

    return _check
