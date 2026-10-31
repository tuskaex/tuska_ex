from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db
from dependencies import require_platform_permission
from packages.common.src.models import User
from packages.common.src.admin_schemas import IndicatorIn
from services import indicator_service

router = APIRouter(prefix="/indicators", tags=["Indicators"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("")
async def list_indicators(
    admin: User = Depends(require_platform_permission("indicators.view")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.list_indicators(db=db)


@router.get("/{indicator_id}")
async def get_indicator(
    indicator_id: UUID,
    admin: User = Depends(require_platform_permission("indicators.view")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.get_indicator(indicator_id=indicator_id, db=db)


@router.post("")
async def create_indicator(
    body: IndicatorIn,
    request: Request,
    admin: User = Depends(require_platform_permission("indicators.manage")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.create_indicator(
        body=body, admin_id=admin.id, ip_address=_ip(request), db=db,
    )


@router.put("/{indicator_id}")
async def update_indicator(
    indicator_id: UUID,
    body: IndicatorIn,
    request: Request,
    admin: User = Depends(require_platform_permission("indicators.manage")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.update_indicator(
        indicator_id=indicator_id, body=body, admin_id=admin.id,
        ip_address=_ip(request), db=db,
    )


@router.post("/{indicator_id}/convert")
async def convert_indicator(
    indicator_id: UUID,
    request: Request,
    admin: User = Depends(require_platform_permission("indicators.manage")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.convert_indicator(
        indicator_id=indicator_id, admin_id=admin.id, ip_address=_ip(request), db=db,
    )


# Publishing ships code to every trader's terminal, so it is its own grant:
# no employee role carries it by default, only full admins.
@router.post("/{indicator_id}/publish")
async def publish_indicator(
    indicator_id: UUID,
    request: Request,
    admin: User = Depends(require_platform_permission("indicators.publish")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.publish_indicator(
        indicator_id=indicator_id, admin_id=admin.id, ip_address=_ip(request), db=db,
    )


@router.post("/{indicator_id}/disable")
async def disable_indicator(
    indicator_id: UUID,
    request: Request,
    admin: User = Depends(require_platform_permission("indicators.publish")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.disable_indicator(
        indicator_id=indicator_id, admin_id=admin.id, ip_address=_ip(request), db=db,
    )


@router.delete("/{indicator_id}")
async def delete_indicator(
    indicator_id: UUID,
    request: Request,
    admin: User = Depends(require_platform_permission("indicators.publish")),
    db: AsyncSession = Depends(get_db),
):
    return await indicator_service.delete_indicator(
        indicator_id=indicator_id, admin_id=admin.id, ip_address=_ip(request), db=db,
    )
