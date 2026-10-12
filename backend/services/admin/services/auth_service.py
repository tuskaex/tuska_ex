"""Admin Auth Service — login, refresh, me."""
import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import verify_password
from packages.common.src.config import get_settings
from packages.common.src.models import User, Employee
from packages.common.src.admin_schemas import AdminLoginRequest, AdminLoginResponse, AdminRefreshRequest
from dependencies import EMPLOYEE_ROLE_PERMISSIONS, ADMIN_LOGIN_ROLES

logger = logging.getLogger("uvicorn.error")
settings = get_settings()


def create_admin_token(admin_id: str, role: str, panel: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=settings.ADMIN_JWT_EXPIRY_HOURS)
    payload = {
        "admin_id": admin_id,
        "role": str(role),
        "type": "admin",
        "exp": expire,
        "iat": now,
    }
    # The admin panel host the session was opened on. get_current_admin
    # refuses the token on any other panel, so a tenant's session cannot be
    # replayed against the platform's panel or another tenant's.
    if panel:
        payload["panel"] = panel
    try:
        return jwt.encode(payload, settings.ADMIN_JWT_SECRET, algorithm=settings.ADMIN_JWT_ALGORITHM)
    except jwt.PyJWTError as e:
        logger.error("Admin JWT encode failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error (JWT)",
        ) from e


async def _assert_panel_matches_host(admin: User, host: str | None, db: AsyncSession) -> None:
    """A white-label tenant's back office and the platform's are separate panels.

    On a tenant's admin host only that tenant's own sub-admin may sign in;
    anyone else is told "Invalid credentials", the same as a wrong password,
    so the panel does not confirm which accounts exist. On any other host a
    sub-admin whose own admin domain is live is sent there instead. A sub-admin
    with no live domain yet can still use the platform's panel, or they would
    have nowhere to sign in at all.
    """
    from services.branding_service import STATUS_READY, find_by_domain, hostnames_for

    owner = await find_by_domain(host, db) if host else None
    if owner is not None and owner.role == "super_admin":
        owner = None  # the platform's own domain: platform panel rules
    if owner is not None:
        if owner.id != admin.id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return
    if (
        admin.role == "sub_admin"
        and admin.custom_domain
        and admin.admin_subdomain
        and admin.custom_domain_status == STATUS_READY
    ):
        own = f"{admin.admin_subdomain}.{admin.custom_domain}"
        if own in hostnames_for(admin.custom_domain, admin.app_subdomain, admin.admin_subdomain):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sign in to your own admin panel at https://{own}",
            )


async def admin_login(body: AdminLoginRequest, db: AsyncSession, host: str | None = None) -> AdminLoginResponse:
    email_norm = (body.email or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    try:
        result = await db.execute(
            select(User).where(
                func.lower(User.email) == email_norm,
                User.role.in_(ADMIN_LOGIN_ROLES),
            )
        )
    except (OperationalError, DBAPIError) as e:
        logger.exception("Database error on admin login")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from e

    admin = result.scalar_one_or_none()

    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    password_ok = verify_password(body.password, admin.password_hash)
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if admin.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    await _assert_panel_matches_host(admin, host, db)

    token = create_admin_token(str(admin.id), admin.role, panel=host)

    return AdminLoginResponse(
        access_token=token,
        admin_id=str(admin.id),
        role=admin.role,
        first_name=admin.first_name,
        last_name=admin.last_name,
    )


async def admin_refresh(
    body: AdminRefreshRequest, db: AsyncSession, host: str | None = None,
) -> AdminLoginResponse:
    try:
        payload = jwt.decode(
            body.access_token,
            settings.ADMIN_JWT_SECRET,
            algorithms=[settings.ADMIN_JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        if payload.get("type") != "admin":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        admin_id = payload.get("admin_id")
        panel = payload.get("panel")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(
        select(User).where(
            User.id == admin_id,
            User.role.in_(ADMIN_LOGIN_ROLES),
            User.status == "active",
        )
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    if panel and host and panel != host:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    token = create_admin_token(str(admin.id), admin.role, panel=panel or host)
    return AdminLoginResponse(
        access_token=token,
        admin_id=str(admin.id),
        role=admin.role,
        first_name=admin.first_name,
        last_name=admin.last_name,
    )


async def change_admin_password(admin: User, current_password: str, new_password: str, db: AsyncSession) -> dict:
    if not verify_password(current_password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")
    from packages.common.src.auth import hash_password
    admin.password_hash = hash_password(new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


async def get_admin_me(admin: User, db: AsyncSession) -> dict:
    employee_role = None
    permissions = set()

    if admin.role == "super_admin":
        employee_role = "super_admin"
        permissions = {"*"}
    else:
        emp_q = await db.execute(
            select(Employee).where(Employee.user_id == admin.id, Employee.is_active == True)
        )
        emp = emp_q.scalar_one_or_none()
        if emp:
            employee_role = emp.role
            # Union with extra_permissions, matching require_permission():
            # role defaults | extras. Reading only the role defaults meant the
            # sidebar hid sections the API would happily have served — a
            # super-admin could grant a permission and the grantee never saw
            # the menu entry for it.
            permissions = (
                EMPLOYEE_ROLE_PERMISSIONS.get(emp.role, set())
                | set(emp.extra_permissions or [])
            )

    return {
        "id": str(admin.id),
        "email": admin.email,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
        "role": admin.role,
        "employee_role": employee_role,
        "permissions": list(permissions),
    }
