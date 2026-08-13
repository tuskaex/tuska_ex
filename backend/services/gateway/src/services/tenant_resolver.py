"""Attribute a signup — and gate a login — to the white-label tenant it belongs to.

Before this, `users.assigned_admin_id` was only ever written by a super-admin
clicking Assign in the back office, and `users.signup_origin` was a column that
existed in the schema (migration 0059) and was never written by anything. The
consequence was that a tenant could not acquire a client on their own: every
signup arriving through their referral link or their own domain landed in the
platform pool, and somebody had to notice and move it by hand.

Two signals, in priority order:

  1. `?ref=<public_code>` — explicit, survives the user browsing away to the
     platform's own host mid-signup.
  2. the Host the request arrived on — a visitor who typed broker.com and
     registered there belongs to broker.com, with no code in the URL.

Both are best-effort. A registration must never fail because tenant attribution
could not be worked out; the fallback is the platform pool, which is exactly
where every row sat before this module existed.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src import tenant_hosts
from packages.common.src.models import User

logger = logging.getLogger("gateway.tenant_resolver")

# Rows that can own a pool. Mirrors branding_service.BRAND_OWNER_ROLES, which
# lives in the admin service and cannot be imported from here.
POOL_OWNER_ROLES = ("sub_admin", "super_admin")

ORIGIN_PLATFORM = "PLATFORM"
ORIGIN_REFERRAL = "BRANDED_REFERRAL"
ORIGIN_DOMAIN = "CUSTOM_DOMAIN"


def served_host(request: Request | None) -> str:
    """The hostname this request was served as.

    X-Forwarded-Host first because nginx terminates for us and `Host` is then
    the upstream name. Mirrors `auth_service._served_host` — kept separate only
    because importing it would make this module depend on the auth service.
    """
    if request is None:
        return ""
    fwd = (request.headers.get("x-forwarded-host") or "").strip()
    if fwd:
        return tenant_hosts.normalise_host(fwd.split(",")[0])
    origin = (request.headers.get("origin") or "").strip()
    if origin:
        host = tenant_hosts.normalise_host(origin)
        if host:
            return host
    return tenant_hosts.normalise_host(request.headers.get("host"))


async def find_owner_by_code(code: str | None, db: AsyncSession) -> User | None:
    """Resolve a tenant by their shareable `?ref=` code.

    Only pool-owning roles match. A client's own referral code belongs to the IB
    commission system and must not silently reassign the new signup's pool.
    """
    c = (code or "").strip().upper()
    if not c:
        return None
    try:
        return (
            await db.execute(
                select(User).where(
                    func.upper(User.public_code) == c,
                    User.role.in_(POOL_OWNER_ROLES),
                )
            )
        ).scalar_one_or_none()
    except Exception:
        logger.warning("tenant lookup by code failed for %r", c, exc_info=True)
        return None


async def find_owner_by_host(request: Request | None, db: AsyncSession) -> User | None:
    """Resolve the tenant that owns the hostname this request arrived on.

    Only READY domains resolve. A tenant who has connected a domain we are not
    serving yet must not start capturing signups — until the operator runs
    connect-tenant-domain.sh the visitor is looking at the platform's own site.
    """
    host = served_host(request)
    if not host:
        return None
    try:
        await tenant_hosts.refresh()
    except Exception:
        return None
    apex = tenant_hosts.apex_for_host(host)
    if not apex:
        return None
    try:
        return (
            await db.execute(
                select(User).where(
                    User.custom_domain == apex,
                    User.custom_domain_status == "READY",
                    User.role.in_(POOL_OWNER_ROLES),
                )
            )
        ).scalar_one_or_none()
    except Exception:
        logger.warning("tenant lookup by host failed for %r", host, exc_info=True)
        return None


async def resolve_signup_owner(
    *,
    referral_code: str | None,
    request: Request | None,
    db: AsyncSession,
) -> tuple[uuid.UUID | None, str, bool]:
    """Work out which pool a new signup joins.

    Returns `(assigned_admin_id, signup_origin, code_was_tenant)`.

    `code_was_tenant` tells the caller whether `referral_code` was consumed as a
    tenant code. When it was, the caller must NOT also hand it to the IB
    referral engine: the two namespaces are distinct, and crediting an IB
    commission to a code that identifies a broker would invent a payout.

    A super-admin owner resolves to `None` — the platform pool is represented by
    a NULL `assigned_admin_id`, not by the super-admin's own id, and every
    existing scope query depends on that.
    """
    owner = await find_owner_by_code(referral_code, db)
    if owner is not None:
        return _pool_id(owner), ORIGIN_REFERRAL, True

    owner = await find_owner_by_host(request, db)
    if owner is not None:
        return _pool_id(owner), ORIGIN_DOMAIN, False

    return None, ORIGIN_PLATFORM, False


def _pool_id(owner: User) -> uuid.UUID | None:
    return None if owner.role == "super_admin" else owner.id


def apply_signup_owner(
    user: User,
    assigned_admin_id: uuid.UUID | None,
    signup_origin: str,
) -> None:
    """Stamp pool membership on a freshly built (not yet committed) user row.

    Never overwrites an existing assignment: the unverified-signup path in
    `register_user` reuses an existing row, and a user who was already moved
    into a pool by an admin must not be silently re-pooled by re-registering.
    """
    if assigned_admin_id is not None and getattr(user, "assigned_admin_id", None) is None:
        user.assigned_admin_id = assigned_admin_id
    if not getattr(user, "signup_origin", None):
        user.signup_origin = signup_origin


async def assert_login_allowed_on_host(
    user: User,
    request: Request | None,
    db: AsyncSession,
) -> bool:
    """May this user sign in on the host the request arrived on?

    Fails OPEN when the host resolves to no tenant. That covers the platform's
    own hostnames, local development, and a tenant whose domain is connected but
    not yet served — none of which should lock anybody out.

    When the host DOES belong to a tenant, only that tenant's own clients (and
    the tenant themselves) may sign in. Without this, every broker's login page
    accepts every other broker's users, which both leaks the existence of those
    accounts and puts a client on a site that is not their broker's.
    """
    owner = await find_owner_by_host(request, db)
    if owner is None:
        return True
    if owner.role == "super_admin":
        return True
    if owner.id == user.id:
        return True
    return getattr(user, "assigned_admin_id", None) == owner.id
