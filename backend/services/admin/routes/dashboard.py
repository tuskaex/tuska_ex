from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db
from dependencies import require_permission, scope_user_ids
from packages.common.src.models import User
from packages.common.src.admin_schemas import DashboardStats, DashboardRevenueSeries
from services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# `tenant_safe=True` is earned, not assumed: every query behind these two routes
# takes `scope_user_ids(admin)` and filters to the caller's own clients. For an
# admin / super_admin that helper returns None and the numbers are the whole
# platform's, exactly as before. Drop the scope_ids argument and the mark
# becomes a lie — a sub-admin would read platform totals, which include every
# other tenant's users, deposits and P&L.


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    admin: User = Depends(require_permission("analytics.view", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    return await dashboard_service.get_dashboard_stats(
        db=db, scope_ids=scope_user_ids(admin)
    )


@router.get("/revenue", response_model=DashboardRevenueSeries)
async def dashboard_revenue_series(
    days: int = Query(30, ge=7, le=90),
    admin: User = Depends(require_permission("analytics.view", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    """Daily approved deposit totals and completed withdrawals for the chart."""
    return await dashboard_service.dashboard_revenue_series(
        days=days, db=db, scope_ids=scope_user_ids(admin)
    )
