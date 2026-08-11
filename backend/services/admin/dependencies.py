import uuid
from datetime import datetime
from functools import wraps
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy import select
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
    # White-label tenant operator. Deliberately conservative: everything here is
    # read-or-service, nothing that moves money or changes platform config. A
    # super-admin grants more per sub-admin through extra_permissions, which is
    # additive-only (see require_permission below).
    "sub_admin": {
        "users.view",
        "kyc.view", "kyc.manage",
        "deposits.view", "withdrawals.view",
        "trades.view", "positions.view", "orders.view",
        "tickets.view", "tickets.reply",
        "analytics.view",
    },
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

    A sub_admin is REFUSED any route not carrying that mark. This is deliberate
    and fails closed: a tenant operator holds real permissions like
    `deposits.view` and `kyc.manage`, and an unscoped list endpoint would hand
    them every other broker's clients. Rather than trust that each of the ~30
    reachable endpoints remembered to filter, the default is "no", and a route
    opts in once it genuinely scopes.

    Adding a new admin endpoint therefore cannot silently leak across tenants —
    the worst case is a sub_admin seeing a 403 on something they should be able
    to use, which is visible and fixable, instead of data they should never see.
    """
    async def _check(
        admin: User = Depends(get_current_admin),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # Full admins (role 'admin' or 'super_admin') bypass per-permission checks.
        if admin.role in ADMIN_BYPASS_ROLES:
            return admin

        if admin.role == "sub_admin" and not tenant_safe:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "This section is not available to white-label sub-admins yet — "
                    "it would show clients outside your pool."
                ),
            )

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


def scope_filter(admin: User):
    """SQLAlchemy criterion restricting a `users` query to the caller's pool.

    Returns None when the caller sees everything, so call sites read:

        crit = scope_filter(admin)
        if crit is not None:
            query = query.where(crit)

    super_admin / admin see the whole platform, exactly as before this feature
    existed. A sub_admin sees only clients carrying their id.
    """
    if admin.role == "sub_admin":
        return User.assigned_admin_id == admin.id
    return None


def scope_user_ids(admin: User | None):
    """Scalar subquery of the user ids in the caller's pool, or None.

    `scope_filter` narrows a query already selecting FROM users. Most admin
    lists select from something else (deposits, trades, tickets) and join to a
    user by id, so they need this shape instead:

        sub = scope_user_ids(scope_admin)
        if sub is not None:
            query = query.where(Deposit.user_id.in_(sub))

    None for admin/super_admin, so every pre-existing caller keeps the exact
    query it had before white-label existed.
    """
    if admin is not None and admin.role == "sub_admin":
        return select(User.id).where(User.assigned_admin_id == admin.id).scalar_subquery()
    return None


async def assert_row_in_scope(
    admin: User | None,
    owner_user_id: uuid.UUID | None,
    db: AsyncSession,
) -> None:
    """Refuse a sub_admin reading one row belonging to another tenant's client.

    For detail routes keyed by the row's own id (a deposit id, a KYC document
    id, a ticket id) rather than by user_id — the list is filtered, but the
    detail route would otherwise be reachable by guessing the id.

    404, not 403, for the same reason as assert_user_in_scope: a 403 would
    confirm the row exists.
    """
    if admin is None or admin.role in ADMIN_BYPASS_ROLES:
        return
    if admin.role != "sub_admin":
        return
    if owner_user_id is None:
        raise HTTPException(status_code=404, detail="Not found")
    owner = (
        await db.execute(select(User.assigned_admin_id).where(User.id == owner_user_id))
    ).scalar_one_or_none()
    if owner != admin.id:
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

    if admin.role in ADMIN_BYPASS_ROLES:
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

    admin / super_admin skip the lookup entirely — one less query on the hot path
    and byte-identical behaviour to before white-label existed.
    """
    async def _dep(
        request: Request,
        admin: User = Depends(require_permission(permission, tenant_safe=True)),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if admin.role != "sub_admin":
            return admin
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
