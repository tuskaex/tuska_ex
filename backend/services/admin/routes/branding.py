"""White-label branding — a tenant editing its own brand.

Scope is deliberately "me": there is no /branding/{id}. A sub-admin edits only
its own row, and a super-admin edits the platform default. Cross-tenant edits
would belong on the sub-admins screen, not here.
"""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db
from packages.common.src.models import User
from packages.common.src.admin_schemas import (
    ConnectDomainRequest, MarkProvisionedRequest,
    UpdateBrandingRequest, UpdateSmtpRequest,
)
from dependencies import get_current_admin, write_audit_log
from services import branding_service

router = APIRouter(prefix="/branding", tags=["Branding"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("/me")
async def get_my_branding(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await branding_service.get_my_branding(admin=admin, db=db)


@router.put("/me")
async def update_my_branding(
    body: UpdateBrandingRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    old = {"brand_name": admin.brand_name, "support_email": admin.support_email,
           "support_whatsapp": admin.support_whatsapp}
    out = await branding_service.update_branding(
        admin=admin, brand_name=body.brand_name, support_email=body.support_email,
        support_whatsapp=body.support_whatsapp, db=db,
    )
    await write_audit_log(
        db, admin.id, "update_branding", "branding", admin.id,
        old_values=old,
        new_values={"brand_name": out["brand_name"],
                    "support_email": out["support_email"],
                    "support_whatsapp": out["support_whatsapp"]},
        ip_address=_ip(request),
    )
    await db.commit()
    return out


@router.post("/logo")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    out = await branding_service.upload_logo(admin=admin, file=file, db=db)
    await write_audit_log(
        db, admin.id, "update_branding_logo", "branding", admin.id,
        new_values={"logo_url": out["logo_url"]}, ip_address=_ip(request),
    )
    await db.commit()
    return out


@router.put("/smtp")
async def update_smtp(
    body: UpdateSmtpRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    old = {"smtp_host": admin.smtp_host, "smtp_from": admin.smtp_from,
           "smtp_user": admin.smtp_user, "smtp_port": admin.smtp_port}
    out = await branding_service.update_smtp(
        admin=admin, host=body.smtp_host, port=body.smtp_port, user=body.smtp_user,
        password=body.smtp_password, sender=body.smtp_from, tls=body.smtp_tls, db=db,
    )
    # The password is deliberately absent from both sides of this log.
    await write_audit_log(
        db, admin.id, "update_branding_smtp", "branding", admin.id,
        old_values=old,
        new_values={"smtp_host": out["smtp_host"], "smtp_from": out["smtp_from"],
                    "smtp_user": out["smtp_user"], "smtp_port": out["smtp_port"],
                    "smtp_password_set": out["smtp_password_set"]},
        ip_address=_ip(request),
    )
    await db.commit()
    return out


@router.post("/smtp/test")
async def send_test_email(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the tenant's own address through their own SMTP, so a
    misconfiguration surfaces here instead of on a client's password reset."""
    branding_service.assert_enabled()
    branding_service.assert_brand_owner(admin)

    from packages.common.src.smtp_mail import (
        Brand, send_email, tenant_smtp,
    )

    # tenant_smtp(admin), not smtp_for_user(admin): the latter resolves *who
    # sends mail to this person*, and staff are served by the platform account —
    # so it would test the wrong thing and report "not configured" to a tenant
    # that had just configured it. This button tests the row in front of them.
    smtp = tenant_smtp(admin)
    if smtp is None:
        return {"sent": False,
                "detail": "Set an SMTP host and From address first, then save."}

    brand = Brand(name=admin.brand_name or "Your brand", inline_logo=False)
    ok = await send_email(
        admin.email,
        f"{brand.name} — SMTP test",
        f"<p>This is a test message from {brand.name}.</p>"
        f"<p>If you received it, outbound mail for your clients is working.</p>",
        text=f"Test message from {brand.name}. Outbound mail is working.",
        smtp=smtp, brand=brand,
    )
    return {"sent": bool(ok),
            "detail": "Sent." if ok else "SMTP rejected the message — check the server log."}


# ─── Custom domain ───────────────────────────────────────────────────────

@router.post("/domain")
async def connect_domain(
    body: ConnectDomainRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    out = await branding_service.connect_domain(
        admin=admin, domain=body.domain, app_subdomain=body.app_subdomain,
        admin_subdomain=body.admin_subdomain, db=db,
    )
    await write_audit_log(
        db, admin.id, "connect_custom_domain", "branding", admin.id,
        new_values={"domain": out["custom_domain"], "mode": out["mode"],
                    "hosts": out["served_hostnames"]},
        ip_address=_ip(request),
    )
    await db.commit()
    return out


@router.post("/domain/verify")
async def verify_domain(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    out = await branding_service.verify_domain(admin=admin, db=db)
    await write_audit_log(
        db, admin.id, "verify_custom_domain", "branding", admin.id,
        new_values={"domain": out["custom_domain"], "status": out["status"]},
        ip_address=_ip(request),
    )
    await db.commit()
    return out


@router.post("/domain/provisioned")
async def mark_provisioned(
    body: MarkProvisionedRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Operator-only: record that the hostnames are actually being served.

    Restricted to super_admin because it is a statement about the server, not
    about the tenant's DNS — a tenant marking their own domain READY would tell
    every other part of the platform to start routing to a host nginx has never
    heard of.
    """
    if admin.role != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only the platform owner can mark a domain as live.",
        )
    target = admin
    if body.sub_admin_id:
        row = (await db.execute(
            select(User).where(User.id == uuid.UUID(body.sub_admin_id))
        )).scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail="Tenant not found")
        target = row

    out = await branding_service.mark_provisioned(
        admin=target, db=db, ok=body.ok, error=body.error,
    )
    await write_audit_log(
        db, admin.id, "mark_domain_provisioned", "branding", target.id,
        new_values={"domain": out["custom_domain"], "status": out["status"]},
        ip_address=_ip(request),
    )
    await db.commit()
    return out


@router.delete("/domain")
async def disconnect_domain(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    previous = admin.custom_domain
    out = await branding_service.disconnect_domain(admin=admin, db=db)
    await write_audit_log(
        db, admin.id, "disconnect_custom_domain", "branding", admin.id,
        old_values={"domain": previous}, ip_address=_ip(request),
    )
    await db.commit()
    return out


# ─── Public lookup (no auth) ─────────────────────────────────────────────

public_router = APIRouter(prefix="/branding", tags=["Branding (public)"])


@public_router.get("/by-code/{code}")
async def branding_by_code(code: str, db: AsyncSession = Depends(get_db)):
    """Resolve a ?ref= code to a brand, for the signup page.

    Unauthenticated by necessity — the visitor has no account yet. Returns only
    public chrome; to_public_payload carries no email, no ids, no SMTP.
    """
    owner = await branding_service.find_by_code(code, db)
    return branding_service.to_public_payload(owner)


@public_router.get("/by-domain")
async def branding_by_domain(domain: str, db: AsyncSession = Depends(get_db)):
    owner = await branding_service.find_by_domain(domain, db)
    return branding_service.to_public_payload(owner)


# ─── Media ───────────────────────────────────────────────────────────────

media_router = APIRouter()


@media_router.get("/media/{filename}")
async def serve_logo(filename: str):
    """Unauthenticated on purpose — a logo is public chrome, and the trader app
    loads it with a plain <img>. Mirrors /api/v1/banners/media/{filename}."""
    return branding_service.serve_logo(filename)
