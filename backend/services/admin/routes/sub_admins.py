"""Sub-admin (white-label tenant) management — super-admin only.

Every route is gated by `get_current_admin` and the service enforces
super_admin, matching how routes/employees.py is written.
"""
import uuid

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db
from packages.common.src.models import User
from packages.common.src.admin_schemas import (
    CreateSubAdminRequest, UpdateSubAdminRequest,
    UpdateSubAdminPermissionsRequest,     ResetSubAdminPasswordRequest, AssignUserRequest, BulkAssignRequest,
    UpdateBrandingRequest, UpdateSmtpRequest,
)
from dependencies import get_current_admin, write_audit_log
from services import sub_admin_service

router = APIRouter(prefix="/sub-admins", tags=["Sub Admins"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("")
async def list_sub_admins(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    status_filter: str = Query(None, alias="status"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.list_sub_admins(
        page=page, per_page=per_page, search=search,
        status_filter=status_filter, admin=admin, db=db,
    )


@router.post("")
async def create_sub_admin(
    body: CreateSubAdminRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.create_sub_admin(
        email=body.email, password=body.password,
        first_name=body.first_name, last_name=body.last_name, phone=body.phone,
        permissions=body.permissions,
        admin=admin, ip_address=_ip(request), db=db,
    )


# ─── Pool assignment (keyed by client, not by tenant) ────────────────────

@router.post("/assign/{user_id}")
async def assign_user(
    user_id: uuid.UUID,
    body: AssignUserRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.assign_users(
        user_ids=[user_id],
        sub_admin_id=uuid.UUID(body.sub_admin_id) if body.sub_admin_id else None,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.post("/assign-bulk")
async def bulk_assign(
    body: BulkAssignRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.assign_users(
        user_ids=[uuid.UUID(u) for u in body.user_ids],
        sub_admin_id=uuid.UUID(body.sub_admin_id) if body.sub_admin_id else None,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.get("/{sub_admin_id}")
async def get_sub_admin(
    sub_admin_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.get_sub_admin(
        sub_admin_id=sub_admin_id, admin=admin, db=db,
    )


@router.put("/{sub_admin_id}")
async def update_sub_admin(
    sub_admin_id: uuid.UUID,
    body: UpdateSubAdminRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.update_sub_admin(
        sub_admin_id=sub_admin_id, first_name=body.first_name,
        last_name=body.last_name, phone=body.phone,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.put("/{sub_admin_id}/permissions")
async def update_permissions(
    sub_admin_id: uuid.UUID,
    body: UpdateSubAdminPermissionsRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.update_permissions(
        sub_admin_id=sub_admin_id, permissions=body.permissions,
        admin=admin, ip_address=_ip(request), db=db,
    )


class AssignDomainRequest(BaseModel):
    domain: str
    app_subdomain: str | None = None
    admin_subdomain: str | None = None


@router.post("/{sub_admin_id}/domain")
async def assign_domain(
    sub_admin_id: uuid.UUID,
    body: AssignDomainRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Point a white-label domain at this sub-admin.

    /admin/branding/domain acts on the caller's OWN row, so a super-admin had no
    way to give a tenant a domain — and a domain left on the super-admin's row
    sends every signup to the platform pool while rendering the tenant's brand
    perfectly, which looks exactly like a broken feature. Moves the domain off
    whoever holds it, this account included.
    """
    return await sub_admin_service.assign_domain(
        sub_admin_id=sub_admin_id, domain=body.domain,
        app_subdomain=body.app_subdomain, admin_subdomain=body.admin_subdomain,
        admin=admin, ip_address=_ip(request), db=db,
    )




# ── Tenant branding, set by the platform owner ───────────────────────────
# /admin/branding/* acts on the CALLER's own row, so before these existed a
# super-admin had no way to configure a tenant's brand: the only logo control
# they could see was their own, and a tenant's logo duly ended up on the
# platform row, where it renders for the platform and not for them. Tenants no
# longer self-serve branding (assert_may_manage_branding is super_admin-only),
# so this is the one way it gets set.


@router.get("/{sub_admin_id}/branding")
async def get_tenant_branding(
    sub_admin_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.get_branding(
        sub_admin_id=sub_admin_id, admin=admin, db=db,
    )


@router.put("/{sub_admin_id}/branding")
async def update_tenant_branding(
    sub_admin_id: uuid.UUID,
    body: UpdateBrandingRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.update_branding(
        sub_admin_id=sub_admin_id, brand_name=body.brand_name,
        support_email=body.support_email, support_whatsapp=body.support_whatsapp,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.post("/{sub_admin_id}/branding/logo")
async def upload_tenant_logo(
    sub_admin_id: uuid.UUID,
    request: Request,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.upload_logo(
        sub_admin_id=sub_admin_id, file=file,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.put("/{sub_admin_id}/branding/smtp")
async def update_tenant_smtp(
    sub_admin_id: uuid.UUID,
    body: UpdateSmtpRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.update_smtp(
        sub_admin_id=sub_admin_id, host=body.smtp_host, port=body.smtp_port,
        user=body.smtp_user, password=body.smtp_password, sender=body.smtp_from,
        tls=body.smtp_tls, admin=admin, ip_address=_ip(request), db=db,
    )


@router.post("/{sub_admin_id}/block")
async def block_sub_admin(
    sub_admin_id: uuid.UUID,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.set_blocked(
        sub_admin_id=sub_admin_id, blocked=True,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.post("/{sub_admin_id}/unblock")
async def unblock_sub_admin(
    sub_admin_id: uuid.UUID,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.set_blocked(
        sub_admin_id=sub_admin_id, blocked=False,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.post("/{sub_admin_id}/reset-password")
async def reset_password(
    sub_admin_id: uuid.UUID,
    body: ResetSubAdminPasswordRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.reset_password(
        sub_admin_id=sub_admin_id, new_password=body.new_password,
        admin=admin, ip_address=_ip(request), db=db,
    )


@router.delete("/{sub_admin_id}")
async def delete_sub_admin(
    sub_admin_id: uuid.UUID,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.delete_sub_admin(
        sub_admin_id=sub_admin_id, admin=admin, ip_address=_ip(request), db=db,
    )


@router.get("/{sub_admin_id}/users")
async def list_assigned_users(
    sub_admin_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.list_assigned_users(
        sub_admin_id=sub_admin_id, page=page, per_page=per_page, admin=admin, db=db,
    )


@router.get("/{sub_admin_id}/report")
async def pool_report(
    sub_admin_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.pool_report(
        sub_admin_id=sub_admin_id, admin=admin, db=db,
    )


@router.post("/{sub_admin_id}/impersonate")
async def impersonate(
    sub_admin_id: uuid.UUID,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await sub_admin_service.impersonate(
        sub_admin_id=sub_admin_id, admin=admin, ip_address=_ip(request), db=db,
    )
