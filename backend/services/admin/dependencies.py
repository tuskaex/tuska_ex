import uuid
from datetime import datetime
from functools import wraps
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.config import get_settings
from packages.common.src.database import get_db
from packages.common.src.models import User, Employee

security = HTTPBearer()
settings = get_settings()

EMPLOYEE_ROLE_PERMISSIONS = {
    "super_admin": {"*"},
    "trade_manager": {
        "trades.view", "trades.modify", "trades.close", "trades.create",
        "positions.view", "orders.view", "users.view",
        "social.view", "social.manage",
    },
    "support": {
        "tickets.view", "tickets.reply", "tickets.assign",
        "users.view", "deposits.view", "withdrawals.view",
        "kyc.view", "kyc.manage",
        "audit_logs.view",
    },
    "finance": {
        "deposits.view", "deposits.approve", "deposits.reject",
        "withdrawals.view", "withdrawals.approve", "withdrawals.reject",
        "users.view", "users.add_fund", "users.deduct_fund",
        "banks.view", "banks.create", "banks.update",
        "ib.view",
        "kyc.view", "kyc.manage",
    },
    "risk_manager": {
        "trades.view", "positions.view", "users.view",
        "users.ban", "users.block_trading", "users.kill_switch",
        "analytics.view", "exposure.view",
        "audit_logs.view",
    },
    "marketing": {
        "banners.view", "banners.create", "banners.update", "banners.delete",
        "bonus.view", "bonus.create", "bonus.update",
        "ib.view", "ib.manage",
    },
    # White-label tenant operator. EMPTY ON PURPOSE — a sub-admin holds exactly
    # what the super-admin granted in `extra_permissions`, and nothing else.
    #
    # Every other key here is an internal job description: "support" means a
    # person who answers tickets, so the role implying a duty set is right. A
    # sub_admin is not a job, it is a separate company. What one tenant may do
    # is a per-tenant commercial decision, so there is no set of permissions
    # that is correct to hand out by default.
    #
    # This used to carry eleven read/service permissions. Because
    # require_permission (below) and /me both compute `role_perms | extra`, a
    # union, those eleven were granted to every tenant whether or not the
    # super-admin chose them — and could not be taken away, since extras only
    # add. A tenant granted two permissions was served seven sidebar sections
    # and the API behind them. Emptying it makes the grant mean what it says.
    #
    # A tenant with nothing granted can still reach /branding: those routes
    # authorise on brand ownership (assert_brand_owner), not on a permission,
    # so a tenant can always manage their own brand.
    "sub_admin": set(),
}

# Roles that reach the admin API at all. 'sub_admin' is here so a tenant
# operator can sign in; it is NOT in ADMIN_BYPASS_ROLES below.
ADMIN_LOGIN_ROLES = ["admin", "super_admin", "sub_admin"]

# Roles for which require_permission() short-circuits.
#
# 'sub_admin' must never be added here. employee_service.create_employee mints
# employees as User(role='admin'), so this tuple is already effectively "any
# staff member" — adding sub_admin would hand every tenant operator the whole
# platform and make assert_user_in_scope pointless.
ADMIN_BYPASS_ROLES = ("admin", "super_admin")


ADMIN_COOKIE_NAME = "fx_admin"


async def get_current_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the active admin from EITHER an HttpOnly cookie (preferred —
    no XSS-readable token) OR a Bearer header (legacy clients). The
    cookie path is what the new admin frontend uses; the header path
    is retained so cron / scripts that already mint a token via /login
    keep working until they migrate."""
    token: str | None = None
    cookie_token = request.cookies.get(ADMIN_COOKIE_NAME)
    if cookie_token:
        token = cookie_token
    elif credentials is not None:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(
            token,
            settings.ADMIN_JWT_SECRET,
            algorithms=[settings.ADMIN_JWT_ALGORITHM],
        )
        if payload.get("type") != "admin":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
        admin_id = payload.get("admin_id")
        if admin_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        # A session belongs to the admin panel it was opened on (a tenant's
        # admin.<domain> or the platform's). Tokens minted before this claim
        # existed carry none and are accepted until they expire.
        panel = payload.get("panel")
        if panel:
            from packages.common.src.tenant_hosts import normalise_host
            here = normalise_host(
                (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0]
            )
            if here and here != panel:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(admin_id),
            User.role.in_(ADMIN_LOGIN_ROLES),
            User.status == "active",
        )
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin user not found or inactive")

    return admin


async def get_platform_admin(admin: User = Depends(get_current_admin)) -> User:
    """get_current_admin, minus white-label tenants.

    require_permission is what refuses a sub_admin anything not marked
    tenant_safe, but a handful of routers predate per-permission checks and
    guard themselves inside the service layer instead — they depend on
    get_current_admin directly. Widening ADMIN_LOGIN_ROLES so a sub_admin can
    sign in therefore handed them every one of those routes, and the
    tenant_safe guarantee quietly did not cover them.

    Measured against the deployed build before this existed: a sub_admin got
    200 from /settings with the platform's own configuration in the body
    (auto_approve_deposit_threshold and the rest), and 200 from /employees.
    That list only read empty because every employee row on the platform was
    itself a sub_admin, which list_employees filters out — the first real
    staff member would have been visible to every tenant.

    Applied to the routers that are platform-wide by nature. Not to branding
    (a tenant edits its own), auth (it must reach login and /me), or
    notifications (already scoped to the caller's own id).
    """
    if admin.role == "sub_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This section belongs to the platform, not to a white-label sub-admin.",
        )
    return admin


def require_permission(permission: str, *, tenant_safe: bool = False):
    """FastAPI dependency factory that checks if the current admin has the required permission.

    `tenant_safe` marks a route as having been made aware of white-label pools —
    i.e. it filters its results (or its target) to the caller's own clients.

    Two different things gate a sub_admin, and it matters which:

      tenant_safe=True  — the route scopes to the caller's pool. Granting the
                          permission shows them THEIR clients.
      tenant_safe=False — the route is platform-wide. Granting the permission
                          shows them EVERY tenant's data on that page.

    The second case used to be refused outright, whatever the super-admin had
    granted. That default was right while nobody could express an opinion; it is
    wrong now that the permission form lists these sections explicitly and the
    platform owner ticks them on purpose. A route is no longer allowed to
    overrule the person who owns the platform.

    What has NOT changed is fail-closed: a permission that was never granted is
    still refused. Nothing opens by default, and adding a new endpoint still
    grants a sub_admin nothing until somebody ticks it. What changed is that the
    tick now decides, instead of being silently discarded.

    Three sections stay unreachable regardless, because they are guarded
    elsewhere and not by this factory: Employees and Settings depend on
    `get_platform_admin`, and sub-admin management calls `_only_super_admin`.
    Those are the platform's own administration — a sub_admin holding them would
    not be a tenant any more.
    """
    async def _check(
        admin: User = Depends(get_current_admin),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # Full admins (role 'admin' or 'super_admin') bypass per-permission checks.
        if admin.role in ADMIN_BYPASS_ROLES:
            return admin

        result = await db.execute(
            select(Employee).where(Employee.user_id == admin.id, Employee.is_active == True)
        )
        employee = result.scalar_one_or_none()
        if employee:
            role_perms = EMPLOYEE_ROLE_PERMISSIONS.get(employee.role, set())
            extra = set(employee.extra_permissions or [])
            effective = role_perms | extra
            if "*" in effective or permission in effective:
                return admin

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{permission}' required",
        )
    return _check


def require_platform_permission(permission: str):
    """`require_permission`, refused outright to a white-label sub_admin.

    For sections whose tables have no tenant column (banks, deposit wallets,
    config, instruments, account types, banners, bonus, IB/MLM, copy masters):
    a grant there would show a tenant the parent's and every other tenant's
    data, and let them edit settings the parent's own clients run on.
    """
    async def _dep(admin: User = Depends(require_permission(permission))) -> User:
        if admin.role == "sub_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This section belongs to the platform, not to a white-label sub-admin.",
            )
        return admin
    return _dep


def scope_filter(admin: User):
    """SQLAlchemy criterion restricting a `users` query to the caller's pool.

    Every role now has a pool, so this never returns None. Call sites still
    read:

        crit = scope_filter(admin)
        if crit is not None:
            query = query.where(crit)

    A sub_admin sees clients carrying their id. Platform staff — admin and
    super_admin — see the PLATFORM's own pool, meaning `assigned_admin_id IS
    NULL`, and no longer every tenant's clients alongside their own.

    That last part is the white-label promise taken literally: a tenant is a
    separate broker, their clients are theirs, and the parent's user list is the
    parent's own book. Before this, a sub-admin's client appeared in both
    panels, which made "separate broker" true in the tenant's view and false in
    the platform's.

    WHAT THIS COSTS, deliberately accepted: the platform owner stops seeing
    tenant clients in Users, Deposits, Trades, Tickets and the dashboard
    totals. On a B-book that also hides exposure the platform still carries —
    the house is counterparty to those trades whether or not it can see them.
    Reverting is this function and `scope_user_ids` below.

    Not by id either: assert_user_in_scope and assert_row_in_scope refuse
    platform staff a tenant client's user or rows with a 404. A sub-broker's
    clients are that sub-broker's alone. The platform oversees the broker
    itself from the Sub-brokers screen (sub_admin_service), which is the one
    deliberate window onto a tenant's pool.
    """
    if admin.role == "sub_admin":
        return User.assigned_admin_id == admin.id
    # Tenant operators also carry a NULL assigned_admin_id; they are managed
    # under Sub-admins, not counted as the platform's own clients.
    return and_(
        User.assigned_admin_id.is_(None),
        or_(User.role.is_(None), User.role != "sub_admin"),
    )


def scope_user_ids(admin: User | None):
    """Scalar subquery of the user ids in the caller's pool, or None.

    `scope_filter` narrows a query already selecting FROM users. Most admin
    lists select from something else (deposits, trades, tickets) and join to a
    user by id, so they need this shape instead:

        sub = scope_user_ids(scope_admin)
        if sub is not None:
            query = query.where(Deposit.user_id.in_(sub))

    Mirrors `scope_filter`: a sub_admin gets their own clients, platform staff
    get the platform's own pool (`assigned_admin_id IS NULL`) rather than
    everybody's.

    Still returns None when `admin` is None — several callers pass that to mean
    "no scoping at all", and those are internal paths with no caller identity,
    not a role decision.
    """
    if admin is None:
        return None
    if admin.role == "sub_admin":
        return select(User.id).where(User.assigned_admin_id == admin.id).scalar_subquery()
    return platform_user_ids()


def platform_user_ids():
    """Scalar subquery of the platform's own clients' ids.

    For the platform-only sections (IB, bonuses, social/PAMM, admin audit log),
    which only platform staff reach and whose services take no caller: they
    filter to this so a sub-broker's clients never appear there.
    """
    return select(User.id).where(
        User.assigned_admin_id.is_(None),
        or_(User.role.is_(None), User.role != "sub_admin"),
    ).scalar_subquery()


async def assert_platform_client(user_id: uuid.UUID | None, db: AsyncSession) -> None:
    """404 unless `user_id` is one of the platform's own clients.

    The by-id counterpart of platform_user_ids(), for actions in those same
    platform-only services (move a user under an IB, approve a master request).
    """
    if user_id is None:
        return
    assigned = (
        await db.execute(select(User.assigned_admin_id).where(User.id == user_id))
    ).scalar_one_or_none()
    if assigned is not None:
        raise HTTPException(status_code=404, detail="Not found")


async def assert_row_in_scope(
    admin: User | None,
    owner_user_id: uuid.UUID | None,
    db: AsyncSession,
) -> None:
    """Refuse anyone acting on a row that belongs to another pool's client.

    For detail routes keyed by the row's own id (a deposit id, a KYC document
    id, a ticket id) rather than by user_id — the list is filtered, but the
    detail route would otherwise be reachable by guessing the id.

    Both directions: a sub_admin reaches only their own clients' rows, and
    platform staff reach only the platform's own clients' rows. A sub-broker's
    clients are managed by that sub-broker alone; the platform has no hand in
    them (it oversees the broker from the Sub-brokers screen instead).

    404, not 403, for the same reason as assert_user_in_scope: a 403 would
    confirm the row exists.
    """
    if admin is None:
        return
    if owner_user_id is None:
        if admin.role == "sub_admin":
            raise HTTPException(status_code=404, detail="Not found")
        return
    owner = (
        await db.execute(select(User.assigned_admin_id).where(User.id == owner_user_id))
    ).scalar_one_or_none()
    if admin.role == "sub_admin":
        if owner != admin.id:
            raise HTTPException(status_code=404, detail="Not found")
    elif owner is not None:
        raise HTTPException(status_code=404, detail="Not found")


async def assert_user_in_scope(
    admin: User,
    target_user_id: uuid.UUID,
    db: AsyncSession,
) -> User:
    """Load a target user and refuse if the caller has no business touching it.

    Returns the loaded row so callers don't fetch it twice.

    404 rather than 403 when a sub-admin asks for someone else's client: a 403
    confirms the id exists, which would let a tenant enumerate the platform's
    user ids one request at a time. A missing row and a foreign row look the
    same from outside.
    """
    result = await db.execute(select(User).where(User.id == target_user_id))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    if admin.role != "sub_admin":
        # Platform staff manage the platform's own clients only. A sub-broker's
        # client belongs to that sub-broker; the platform answers as if the
        # account did not exist.
        if target.assigned_admin_id is not None:
            raise HTTPException(status_code=404, detail="User not found")
        return target

    if admin.role == "sub_admin":
        # A tenant operator manages clients, never other staff — including
        # themselves. Without this, a sub-admin assigned to their own row could
        # edit their own permissions or balance.
        if target.role in ADMIN_LOGIN_ROLES or target.role in (
            "employee", "manager", "support",
        ):
            raise HTTPException(status_code=404, detail="User not found")
        if target.assigned_admin_id != admin.id:
            raise HTTPException(status_code=404, detail="User not found")
        return target

    return target


def require_user_in_scope(permission: str):
    """`require_permission` plus a pool check on the `{user_id}` path param.

    Swapping `require_permission("users.ban")` for
    `require_user_in_scope("users.ban")` on a /users/{user_id}/… route is the
    whole change — the handler body and the service signature stay as they are.

    Only routes that carry a `user_id` path parameter can use this; FastAPI
    resolves it from the path the same way the handler does.
    """
    async def _dep(
        user_id: uuid.UUID,
        # tenant_safe: the scope check below is exactly what makes it so.
        admin: User = Depends(require_permission(permission, tenant_safe=True)),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        await assert_user_in_scope(admin, user_id, db)
        return admin
    return _dep


def require_owned_row(permission: str, model_name: str, param: str):
    """`require_permission` plus an ownership check on a row named in the path.

    `require_user_in_scope` covers routes keyed by `{user_id}`. This covers the
    rest — `/finance/deposits/{deposit_id}/approve`, `/support/tickets/{id}` —
    where the path names a row that *belongs to* a user. Without it a tenant
    holding `deposits.approve` could approve another broker's deposit simply by
    guessing its id; the filtered list would never have shown it to them.

    The row id is read from `request.path_params` rather than declared as an
    argument so one factory serves every route regardless of what it calls the
    parameter. `model_name` is resolved lazily against packages.common.src.models
    to keep this module's import graph as it is.

    Runs for every role: platform staff are held to the platform's own pool
    the same way a sub_admin is held to theirs (see assert_row_in_scope).
    """
    async def _dep(
        request: Request,
        admin: User = Depends(require_permission(permission, tenant_safe=True)),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        raw = request.path_params.get(param)
        try:
            row_id = uuid.UUID(str(raw))
        except (TypeError, ValueError):
            raise HTTPException(status_code=404, detail="Not found")
        from packages.common.src import models as _models

        model = getattr(_models, model_name)
        owner = (
            await db.execute(select(model.user_id).where(model.id == row_id))
        ).scalar_one_or_none()
        await assert_row_in_scope(admin, owner, db)
        return admin
    return _dep


async def write_audit_log(
    db: AsyncSession,
    admin_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: Optional[uuid.UUID] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """Insert one row into the admin audit log.

    CONTRACT: this function does NOT commit. The audit insert MUST share
    the caller's transaction with whatever financial mutation it
    documents — otherwise a crash between the audit write and the
    mutation commit would leave one of them orphaned. We only flush, so
    the caller's eventual db.commit() (or db.rollback() on error) is
    the single decision point. Do NOT add db.commit() here under any
    circumstance — the C4 concern from the security audit is exactly
    that.

    Defence in depth: any free-floating Decimal in the JSON payload is
    coerced to a string here so JSONB stores its exact representation
    instead of a lossy float — see H10."""
    from decimal import Decimal as _D
    from packages.common.src.models import AuditLog

    def _safe(d):
        if d is None:
            return None
        return {k: (str(v) if isinstance(v, _D) else v) for k, v in d.items()}

    log = AuditLog(
        admin_id=admin_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=_safe(old_values),
        new_values=_safe(new_values),
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()
