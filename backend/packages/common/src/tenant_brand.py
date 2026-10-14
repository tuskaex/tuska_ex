"""Who a user "belongs to" for white-label purposes, and what that tenant is called.

One definition shared by mail (smtp_mail), push, and the gateway's user-facing
strings (TOTP issuer, IB referral links, payment descriptions), so they cannot
disagree about whether a given user is a broker's client.

Rule: a user is a tenant user when BRANDING_ENABLED is on and the user is a
`sub_admin` (the broker itself) or is assigned to one. Everybody else —
platform-pool clients (assigned_admin_id NULL), super_admins, staff, and every
user while the flag is off — is a platform user and gets exactly the strings
they always got. Every helper here degrades to "platform" on any error.
"""
from __future__ import annotations

import logging
from typing import Optional

from .config import get_settings

logger = logging.getLogger(__name__)

PLATFORM_BRAND_NAME = "TuskaEx"
STATUS_READY = "READY"


async def branding_owner(user, db):
    """The row that owns this user's branding, or None for the platform pool.

    A sub_admin / super_admin owns their own branding. Never raises.
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
    except Exception as e:  # pragma: no cover — never break callers on lookup
        logger.warning("branding owner lookup failed: %s", e)
        return None


def is_tenant_owner(owner) -> bool:
    """True when `owner` is a white-label broker (not the platform itself)."""
    return owner is not None and getattr(owner, "role", None) == "sub_admin"


async def tenant_owner_for(user, db):
    """The broker row this user belongs to (the broker itself for a sub_admin),
    or None for a platform user / flag off / lookup failure."""
    if user is None or not get_settings().BRANDING_ENABLED:
        return None
    owner = await branding_owner(user, db)
    return owner if is_tenant_owner(owner) else None


async def tenant_owner_for_id(user_id, db):
    """`tenant_owner_for` by user id. Never raises."""
    if not user_id or not get_settings().BRANDING_ENABLED:
        return None
    try:
        from sqlalchemy import select
        from .models import User as _User
        user = (await db.execute(select(_User).where(_User.id == user_id))).scalar_one_or_none()
    except Exception as e:  # pragma: no cover
        logger.warning("tenant owner lookup failed for %s: %s", user_id, e)
        return None
    return await tenant_owner_for(user, db)


def site_url(owner) -> Optional[str]:
    """The broker's own live user-app URL, or None when they have no READY domain.

    Subdomain mode → https://<app_subdomain>.<custom_domain>; apex mode →
    https://<custom_domain>. Mirrors branding_service.domain_payload's app_url.
    """
    if owner is None:
        return None
    if (getattr(owner, "custom_domain_status", None) or "") != STATUS_READY:
        return None
    domain = (getattr(owner, "custom_domain", None) or "").strip().lower().rstrip(".")
    if not domain:
        return None
    label = (getattr(owner, "app_subdomain", None) or "").strip().lower().strip(".")
    return f"https://{label}.{domain}" if label else f"https://{domain}"


def display_name(owner) -> Optional[str]:
    """The broker's public name: brand_name, else its domain. None if neither."""
    if owner is None:
        return None
    name = (getattr(owner, "brand_name", None) or "").strip()
    if not name:
        name = (getattr(owner, "custom_domain", None) or "").strip()
    return name or None


async def brand_name_for(user, db, *, tenant_fallback: str = "Your broker") -> str:
    """Name to show this user. Platform users: PLATFORM_BRAND_NAME, unchanged.
    A broker's client: the broker's name, else `tenant_fallback` — never the
    platform's name."""
    owner = await tenant_owner_for(user, db)
    if owner is None:
        return PLATFORM_BRAND_NAME
    return display_name(owner) or tenant_fallback


async def brand_name_for_id(user_id, db, *, tenant_fallback: str = "Your broker") -> str:
    owner = await tenant_owner_for_id(user_id, db)
    if owner is None:
        return PLATFORM_BRAND_NAME
    return display_name(owner) or tenant_fallback
