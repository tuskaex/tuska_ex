"""Sub-admin (white-label tenant) service — CRUD, pool assignment, impersonation.

A sub-admin is two rows:

  * `users`     — role='sub_admin', carrying created_by
  * `employees` — role='sub_admin', carrying the granted permission strings

The Employee row is not decoration: `require_permission` resolves permissions by
looking up an Employee by user_id, so a sub-admin without one can sign in and
then be refused everything. Both rows are created and deleted together.

Why not role='admin' like employee_service does: `require_permission` short-
circuits for 'admin'/'super_admin' (dependencies.ADMIN_BYPASS_ROLES), so a
sub-admin carrying that role would bypass every permission check and see every
tenant's clients. The whole feature rests on sub_admin being outside that tuple.
"""
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import hash_password
from packages.common.src.models import User, Employee, TradingAccount
from packages.common.src.admin_schemas import PaginatedResponse
from dependencies import write_audit_log, EMPLOYEE_ROLE_PERMISSIONS

SUB_ADMIN_ROLE = "sub_admin"


def _only_super_admin(admin: User) -> None:
    if admin.role != "super_admin":
        raise HTTPException(
            status_code=403, detail="Only super admins can manage sub-admins"
        )


def _full_name(user: User) -> str:
    return f"{user.first_name or ''} {user.last_name or ''}".strip()


async def _load_sub_admin(sub_admin_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(
        select(User).where(User.id == sub_admin_id, User.role == SUB_ADMIN_ROLE)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Sub-admin not found")
    return row


async def _employee_row(user_id: uuid.UUID, db: AsyncSession) -> Employee | None:
    result = await db.execute(select(Employee).where(Employee.user_id == user_id))
    return result.scalar_one_or_none()


async def _counts(user_id: uuid.UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(User)
        .where(User.assigned_admin_id == user_id, User.role == "user")
    )
    return int(result.scalar() or 0)


async def _to_dto(row: User, db: AsyncSession) -> dict:
    # Local import mirrors assign_domain below — branding_service has no
    # dependency on this module, but the file's convention is to reach for it
    # inside the function rather than at import time.
    from services import branding_service as _b

    emp = await _employee_row(row.id, db)
    return {
        "id": str(row.id),
        # The tenant's public code, shown as the CODE column and used in their
        # ?ref= link. Minted at creation so the column is never blank.
        "code": row.public_code,
        "email": row.email,
        "full_name": _full_name(row),
        "first_name": row.first_name,
        "last_name": row.last_name,
        "phone": row.phone,
        "status": row.status,
        "permissions": sorted(set((emp.extra_permissions if emp else None) or [])),
        "default_permissions": sorted(EMPLOYEE_ROLE_PERMISSIONS.get(SUB_ADMIN_ROLE, set())),
        "is_active": bool(emp.is_active) if emp else False,
        "user_count": await _counts(row.id, db),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        # The same payload the tenant's own White-label page renders, computed
        # for THIS row rather than the caller's. Without it the super-admin had
        # no way to see the A records for a domain they had just assigned: the
        # guard in connect_domain sends them here, and assign_domain returned
        # only the DTO, so the records existed on the tenant's row and nothing
        # displayed them. Pure computation — no extra query per row.
        "domain": _b.domain_payload(row),
    }


# ─── Read ────────────────────────────────────────────────────────────────

async def list_sub_admins(
    *, page: int, per_page: int, search: str | None,
    status_filter: str | None, admin: User, db: AsyncSession,
) -> PaginatedResponse:
    _only_super_admin(admin)

    query = select(User).where(User.role == SUB_ADMIN_ROLE)
    if search:
        term = f"%{search}%"
        # Search the columns the list actually shows, so typing what you can see
        # finds the row — code and mobile included, not just name and email.
        query = query.where(
            func.lower(User.email).ilike(term.lower())
            | User.first_name.ilike(term)
            | User.last_name.ilike(term)
            | User.public_code.ilike(term.upper())
            | User.phone.ilike(term)
        )
    if status_filter:
        query = query.where(User.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = int((await db.execute(count_q)).scalar() or 0)

    rows = (
        await db.execute(
            query.order_by(User.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()

    return PaginatedResponse(
        items=[await _to_dto(r, db) for r in rows],
        total=total, page=page, per_page=per_page,
    )


async def get_sub_admin(*, sub_admin_id: uuid.UUID, admin: User, db: AsyncSession) -> dict:
    _only_super_admin(admin)
    return await _to_dto(await _load_sub_admin(sub_admin_id, db), db)


async def list_assigned_users(
    *, sub_admin_id: uuid.UUID, page: int, per_page: int,
    admin: User, db: AsyncSession,
) -> PaginatedResponse:
    _only_super_admin(admin)
    await _load_sub_admin(sub_admin_id, db)

    query = select(User).where(
        User.assigned_admin_id == sub_admin_id, User.role == "user"
    )
    total = int((await db.execute(
        select(func.count()).select_from(query.subquery())
    )).scalar() or 0)

    rows = (await db.execute(
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return PaginatedResponse(
        items=[{
            "id": str(u.id),
            "email": u.email,
            "full_name": _full_name(u),
            "status": u.status,
            "kyc_status": u.kyc_status,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in rows],
        total=total, page=page, per_page=per_page,
    )


async def pool_report(*, sub_admin_id: uuid.UUID, admin: User, db: AsyncSession) -> dict:
    """Aggregate over the tenant's clients: headcount and money under management."""
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)

    client_ids = (await db.execute(
        select(User.id).where(
            User.assigned_admin_id == sub_admin_id, User.role == "user"
        )
    )).scalars().all()

    totals = {"balance": Decimal("0"), "equity": Decimal("0"), "margin_used": Decimal("0")}
    account_count = 0
    if client_ids:
        rows = (await db.execute(
            select(TradingAccount).where(TradingAccount.user_id.in_(client_ids))
        )).scalars().all()
        account_count = len(rows)
        for a in rows:
            totals["balance"] += a.balance or Decimal("0")
            totals["equity"] += a.equity or Decimal("0")
            totals["margin_used"] += a.margin_used or Decimal("0")

    return {
        "sub_admin_id": str(sub.id),
        "full_name": _full_name(sub),
        "client_count": len(client_ids),
        "account_count": account_count,
        "total_balance": float(totals["balance"]),
        "total_equity": float(totals["equity"]),
        "total_margin_used": float(totals["margin_used"]),
    }


# ─── Write ───────────────────────────────────────────────────────────────

async def create_sub_admin(
    *, email: str, password: str, first_name: str | None, last_name: str | None,
    phone: str | None, permissions: list[str],
    admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    _only_super_admin(admin)

    email = (email or "").strip().lower()
    existing = (await db.execute(
        select(User).where(func.lower(User.email) == email)
    )).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Mobile is optional, but if given it must be a real number — a tenant is
    # contacted on it, and "9876" silently stored helps nobody.
    phone = (phone or "").strip() or None
    if phone:
        digits = re.sub(r"\D", "", phone)
        if not (7 <= len(digits) <= 15):
            raise HTTPException(
                status_code=400,
                detail="Enter a valid mobile number (7–15 digits).",
            )

    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name=(first_name or "").strip(),
        last_name=(last_name or "").strip(),
        phone=phone,
        role=SUB_ADMIN_ROLE,
        status="active",
        # Staff never go through KYC; leaving this 'pending' would surface the
        # tenant in the admin KYC queue.
        kyc_status="approved",
        email_verified=True,
        created_by=admin.id,
    )
    db.add(user)
    await db.flush()

    # Allocate the public code now. Retry on the (vanishingly unlikely) clash
    # rather than surfacing an IntegrityError from the unique index.
    for _ in range(8):
        candidate = f"ADM{secrets.randbelow(90000000) + 10000000}"
        clash = (await db.execute(
            select(User.id).where(User.public_code == candidate)
        )).scalar_one_or_none()
        if clash is None:
            user.public_code = candidate
            break

    clean = sorted({str(p).strip() for p in (permissions or []) if str(p).strip()})
    db.add(Employee(user_id=user.id, role=SUB_ADMIN_ROLE, is_active=True,
                    extra_permissions=clean))
    await db.flush()

    await write_audit_log(
        db, admin.id, "create_sub_admin", "sub_admin", user.id,
        new_values={"email": email, "permissions": clean},
        ip_address=ip_address,
    )
    await db.commit()
    return await _to_dto(user, db)


async def update_sub_admin(
    *, sub_admin_id: uuid.UUID, first_name: str | None, last_name: str | None,
    phone: str | None, admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)

    old = {"first_name": sub.first_name, "last_name": sub.last_name, "phone": sub.phone}
    if first_name is not None:
        sub.first_name = first_name.strip()
    if last_name is not None:
        sub.last_name = last_name.strip()
    if phone is not None:
        sub.phone = phone.strip() or None

    await write_audit_log(
        db, admin.id, "update_sub_admin", "sub_admin", sub.id,
        old_values=old,
        new_values={"first_name": sub.first_name, "last_name": sub.last_name,
                    "phone": sub.phone},
        ip_address=ip_address,
    )
    await db.commit()
    return await _to_dto(sub, db)


async def update_permissions(
    *, sub_admin_id: uuid.UUID, permissions: list[str],
    admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)
    emp = await _employee_row(sub.id, db)
    if emp is None:
        raise HTTPException(status_code=404, detail="Sub-admin permission row missing")

    old = sorted(set(emp.extra_permissions or []))
    clean = sorted({str(p).strip() for p in (permissions or []) if str(p).strip()})
    emp.extra_permissions = clean

    await write_audit_log(
        db, admin.id, "update_sub_admin_permissions", "sub_admin", sub.id,
        old_values={"permissions": old}, new_values={"permissions": clean},
        ip_address=ip_address,
    )
    await db.commit()
    return await _to_dto(sub, db)




async def set_blocked(
    *, sub_admin_id: uuid.UUID, blocked: bool,
    admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    """Block/unblock. Flips both rows: `users.status` stops the login, and
    `employees.is_active` stops permission resolution — leaving either alone
    would half-disable the account in a way that is hard to reason about."""
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)
    emp = await _employee_row(sub.id, db)

    old = sub.status
    sub.status = "blocked" if blocked else "active"
    if emp is not None:
        emp.is_active = not blocked

    await write_audit_log(
        db, admin.id, "block_sub_admin" if blocked else "unblock_sub_admin",
        "sub_admin", sub.id,
        old_values={"status": old}, new_values={"status": sub.status},
        ip_address=ip_address,
    )
    await db.commit()
    return await _to_dto(sub, db)


async def reset_password(
    *, sub_admin_id: uuid.UUID, new_password: str,
    admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)
    sub.password_hash = hash_password(new_password)

    # The password itself never reaches the audit log.
    await write_audit_log(
        db, admin.id, "reset_sub_admin_password", "sub_admin", sub.id,
        new_values={"email": sub.email}, ip_address=ip_address,
    )
    await db.commit()
    return {"message": "Password reset", "sub_admin_id": str(sub.id)}


async def delete_sub_admin(
    *, sub_admin_id: uuid.UUID, admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    """Retire a tenant: release their clients, then deactivate the account.

    Soft, not a row delete — the same shape as employee_service.delete_employee,
    and for the same reason: `audit_logs.admin_id` is a foreign key to `users`,
    so hard-deleting anyone who has ever performed an audited action raises a
    ForeignKeyViolation. Destroying the row would also destroy the record of what
    that tenant did, which is the one thing an audit trail must not lose.

    Clients are never deleted — they are real traders with balances — and they
    are released first so no row is left pointing at a retired tenant.
    """
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)

    released = (await db.execute(
        update(User)
        .where(User.assigned_admin_id == sub.id)
        .values(assigned_admin_id=None,
                last_transferred_at=datetime.now(timezone.utc),
                last_transferred_by=admin.id)
        .returning(User.id)
    )).scalars().all()

    emp = await _employee_row(sub.id, db)
    if emp is not None:
        emp.is_active = False
    # 'suspended' rather than 'blocked': both stop the login, but suspended is
    # what delete_employee uses for a retired account and reads as final.
    sub.status = "suspended"

    await write_audit_log(
        db, admin.id, "delete_sub_admin", "sub_admin", sub_admin_id,
        old_values={"email": sub.email, "status": "active"},
        new_values={"status": "suspended", "clients_released": len(released)},
        ip_address=ip_address,
    )
    await db.commit()
    return {"message": "Sub-admin deactivated", "clients_released": len(released)}


# ─── Tenant branding, set by the platform owner ──────────────────────────
#
# branding_service's own routes act on the caller's row. These act on a
# tenant's, which is the only way a brand gets configured now that tenants no
# longer self-serve. The write functions take the actor for authorisation and
# the owner for the mutation; see branding_service.update_branding.


async def _brand_target(sub_admin_id: uuid.UUID, admin: User, db: AsyncSession) -> User:
    """The tenant row to write, after checking the caller may write it."""
    from services import branding_service as _b

    _only_super_admin(admin)
    _b.assert_enabled()
    return _b.load_brand_owner_sync(await _load_sub_admin(sub_admin_id, db))


async def get_branding(*, sub_admin_id: uuid.UUID, admin: User, db: AsyncSession) -> dict:
    from services import branding_service as _b

    sub = await _brand_target(sub_admin_id, admin, db)
    out = _b.to_profile(sub)
    code = await _b.ensure_public_code(sub, db)
    out["public_code"] = code
    out["referral_link"] = _b.referral_link(code)
    out["domain"] = _b.domain_payload(sub)
    return out


async def update_branding(
    *, sub_admin_id: uuid.UUID, brand_name: str | None, support_email: str | None,
    support_whatsapp: str | None, admin: User, ip_address: str | None,
    db: AsyncSession,
) -> dict:
    from services import branding_service as _b

    sub = await _brand_target(sub_admin_id, admin, db)
    old = {"brand_name": sub.brand_name, "support_email": sub.support_email,
           "support_whatsapp": sub.support_whatsapp}
    out = await _b.update_branding(
        admin=admin, owner=sub, brand_name=brand_name,
        support_email=support_email, support_whatsapp=support_whatsapp, db=db,
    )
    await write_audit_log(
        db, admin.id, "update_sub_admin_branding", "sub_admin", sub.id,
        old_values=old,
        new_values={"brand_name": out["brand_name"],
                    "support_email": out["support_email"],
                    "support_whatsapp": out["support_whatsapp"]},
        ip_address=ip_address,
    )
    await db.commit()
    return out


async def upload_logo(
    *, sub_admin_id: uuid.UUID, file, admin: User, ip_address: str | None,
    db: AsyncSession,
) -> dict:
    from services import branding_service as _b

    sub = await _brand_target(sub_admin_id, admin, db)
    out = await _b.upload_logo(admin=admin, owner=sub, file=file, db=db)
    await write_audit_log(
        db, admin.id, "update_sub_admin_branding_logo", "sub_admin", sub.id,
        new_values={"logo_url": out["logo_url"]}, ip_address=ip_address,
    )
    await db.commit()
    return out


async def update_smtp(
    *, sub_admin_id: uuid.UUID, host: str | None, port: int | None,
    user: str | None, password: str | None, sender: str | None, tls: bool | None,
    admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    from services import branding_service as _b

    sub = await _brand_target(sub_admin_id, admin, db)
    out = await _b.update_smtp(
        admin=admin, owner=sub, host=host, port=port, user=user,
        password=password, sender=sender, tls=tls, db=db,
    )
    # The password is deliberately absent from both sides of the log — it is a
    # credential the tenant supplied, and an audit row is not the place for it.
    await write_audit_log(
        db, admin.id, "update_sub_admin_smtp", "sub_admin", sub.id,
        new_values={"smtp_host": out["smtp_host"], "smtp_from": out["smtp_from"],
                    "smtp_user": out["smtp_user"], "smtp_port": out["smtp_port"]},
        ip_address=ip_address,
    )
    await db.commit()
    return out


# ─── Pool assignment ─────────────────────────────────────────────────────

async def assign_users(
    *, user_ids: list[uuid.UUID], sub_admin_id: uuid.UUID | None,
    admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    """Move clients into a tenant's pool, or back to the platform when
    sub_admin_id is None. Used by both the single and bulk endpoints."""
    _only_super_admin(admin)
    if sub_admin_id is not None:
        await _load_sub_admin(sub_admin_id, db)

    moved, failed = [], []
    for uid in user_ids:
        row = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
        if row is None:
            failed.append({"user_id": str(uid), "reason": "not found"})
            continue
        # Only clients get pooled. Assigning staff would put a sub-admin inside
        # another sub-admin's scope check.
        if row.role != "user":
            failed.append({"user_id": str(uid), "reason": "not a client account"})
            continue
        row.assigned_admin_id = sub_admin_id
        row.last_transferred_at = datetime.now(timezone.utc)
        row.last_transferred_by = admin.id
        moved.append(str(uid))

    await write_audit_log(
        db, admin.id, "reassign_users", "sub_admin", sub_admin_id,
        new_values={"moved": moved, "failed": failed,
                    "to": str(sub_admin_id) if sub_admin_id else "platform"},
        ip_address=ip_address,
    )
    await db.commit()
    return {"moved": len(moved), "failed": failed}


# ─── Impersonation ───────────────────────────────────────────────────────

async def impersonate(
    *, sub_admin_id: uuid.UUID, admin: User, ip_address: str | None, db: AsyncSession,
) -> dict:
    """Mint an admin token for the sub-admin, mirroring login_as_employee."""
    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)

    import jwt
    from packages.common.src.config import get_settings
    settings = get_settings()

    expire = datetime.utcnow() + timedelta(hours=8)
    token = jwt.encode(
        {
            "admin_id": str(sub.id),
            "role": sub.role,
            "type": "admin",
            "employee_role": SUB_ADMIN_ROLE,
            "impersonated_by": str(admin.id),
            "exp": expire,
            "iat": datetime.utcnow(),
        },
        settings.ADMIN_JWT_SECRET,
        algorithm=settings.ADMIN_JWT_ALGORITHM,
    )

    await write_audit_log(
        db, admin.id, "impersonate_sub_admin", "sub_admin", sub.id,
        new_values={"email": sub.email}, ip_address=ip_address,
    )
    await db.commit()
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 8 * 3600,
        "sub_admin": {"id": str(sub.id), "email": sub.email,
                      "full_name": _full_name(sub)},
    }

async def assign_domain(
    *, sub_admin_id: uuid.UUID, domain: str, app_subdomain: str | None,
    admin_subdomain: str | None, admin: User, ip_address: str | None,
    db: AsyncSession,
) -> dict:
    """Point a white-label domain at a sub-admin, from the super-admin's side.

    Until this existed the only way to attach a domain was `PUT/POST
    /admin/branding/domain`, which acts on `admin.id` — the caller's OWN row. So
    a super-admin could not put a domain on a tenant: they had to hand the
    tenant their own login and have them do it, and a domain the super-admin had
    already claimed had to be disconnected from that account first.

    That mattered more than it looks. A domain sitting on the super-admin's row
    resolves, via tenant_resolver._pool_id, to the PLATFORM pool — super_admin
    is what NULL assigned_admin_id means — so every signup on it landed in
    TuskaEx and the tenant's own Users page stayed empty while their branding
    rendered perfectly. Indistinguishable from a broken feature.

    Moves rather than copies: `custom_domain` is uniquely indexed, so whoever
    holds it now (super-admin included) is cleared in the same transaction.

    Status goes straight to READY. The operator is asserting that nginx already
    serves these hostnames — which is true whenever the domain is being moved
    off a row where it was already live. `verify_domain` cannot confirm it
    anyway: tenant hosts are proxied through Cloudflare, so their A records
    resolve to Cloudflare and never to PLATFORM_PUBLIC_IP.
    """
    from services import branding_service as _b

    _only_super_admin(admin)
    sub = await _load_sub_admin(sub_admin_id, db)

    d = _b.normalise_domain(domain)
    app_label = _b.normalise_label(app_subdomain) if app_subdomain else None
    admin_label = (
        _b.normalise_label(admin_subdomain, for_admin_panel=True)
        if admin_subdomain else None
    )
    if app_label and admin_label and app_label == admin_label:
        raise HTTPException(
            status_code=400, detail="The app and admin hosts must differ."
        )

    previous = (
        await db.execute(
            select(User).where(User.custom_domain == d, User.id != sub.id)
        )
    ).scalars().all()
    for row in previous:
        row.custom_domain = None
        row.app_subdomain = None
        row.admin_subdomain = None
        row.custom_domain_status = None
        row.custom_domain_last_error = None
        row.custom_domain_provisioned_at = None

    old = {
        "custom_domain": sub.custom_domain,
        "custom_domain_status": sub.custom_domain_status,
    }
    sub.custom_domain = d
    sub.app_subdomain = app_label
    sub.admin_subdomain = admin_label
    sub.custom_domain_status = _b.STATUS_READY
    sub.custom_domain_last_error = None
    sub.custom_domain_provisioned_at = datetime.now(timezone.utc)

    await write_audit_log(
        db, admin.id, "assign_sub_admin_domain", "sub_admin", sub.id,
        old_values=old,
        new_values={
            "custom_domain": d,
            "app_subdomain": app_label,
            "admin_subdomain": admin_label,
            "custom_domain_status": _b.STATUS_READY,
            "taken_from": [r.email for r in previous] or None,
        },
        ip_address=ip_address,
    )
    await db.commit()

    # CORS + cookie scope read a 60-second snapshot of READY domains; without
    # this the tenant's own host is refused for up to a minute after the move.
    _b._tenant_hosts.invalidate()
    return await _to_dto(sub, db)
