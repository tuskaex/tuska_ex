"""Paginated admin-action audit (bonus changes, fund grants, impersonations, …).

PLATFORM-ONLY. This log spans every admin on the installation — the platform
owner's own fund grants and impersonations, and every other tenant's — and it
has no tenant column to filter on.

It is gated by `get_platform_admin` as well as the permission, which is the
same pair Employees and Settings use. Without it, `audit_logs.view` was enough:
that string is shared with `/user-audit-logs`, which IS scoped to the caller's
own clients, so granting a tenant "Audit logs" for their own pool silently
handed them the whole platform's admin history as well. Two different
capabilities behind one permission string, and only one of them was scoped.

The string itself is left alone rather than split, because `support` and
`risk_manager` — internal staff, not tenants — hold `audit_logs.view` for this
page and would have lost it.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import require_permission, get_platform_admin
from packages.common.src.database import get_db
from packages.common.src.models import User
from services import admin_audit_log_service

router = APIRouter(prefix="/admin-audit-logs", tags=["Admin audit logs"])


@router.get("")
async def list_admin_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    admin_id: uuid.UUID | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    admin: User = Depends(require_permission("audit_logs.view")),
    # Refuses a sub_admin outright. See the module docstring: the permission
    # alone is not enough here, because it is shared with a scoped route.
    _platform: User = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_audit_log_service.list_admin_audit_logs(
        page=page, per_page=per_page, admin_id=admin_id, action=action,
        entity_type=entity_type, date_from=date_from, date_to=date_to, db=db,
    )


@router.get("/actions")
async def list_distinct_actions(
    admin: User = Depends(require_permission("audit_logs.view")),
    _platform: User = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Returns the set of distinct `action` values present in the log so
    the UI can populate its action filter dropdown without hard-coding."""
    return await admin_audit_log_service.list_distinct_actions(db)
