from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db
from packages.common.src.models import User
from dependencies import require_permission, get_platform_admin
from services import book_service

router = APIRouter(prefix="/book", tags=["Book Management"])


class ChangeBookTypeBody(BaseModel):
    book_type: str = Field(..., pattern="^[AB]$")


class BulkChangeBookTypeBody(BaseModel):
    user_ids: list[str]
    book_type: str = Field(..., pattern="^[AB]$")


class LPSettingsBody(BaseModel):
    api_url: str = ""
    ws_url: str = ""
    api_key: str = ""
    api_secret: str = ""


# ── Stats ──

@router.get("/stats")
async def get_stats(
    # tenant_safe: get_book_stats counts the caller's pool only.
    admin: User = Depends(require_permission("trades.view", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.get_book_stats(db, scope_admin=admin)


# ── Users ──

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    book_type: str | None = Query(None),
    # tenant_safe: list_book_users applies the pool filter.
    admin: User = Depends(require_permission("trades.view", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.list_book_users(page, per_page, search, book_type, db, scope_admin=admin)


@router.put("/users/bulk-book-type")
async def bulk_change(
    body: BulkChangeBookTypeBody,
    request: Request,
    # tenant_safe: the UPDATE carries the pool criterion.
    admin: User = Depends(require_permission("trades.manage", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    return await book_service.bulk_change_book_type(
        body.user_ids, body.book_type, admin.id, ip, db, scope_admin=admin
    )


@router.put("/users/{user_id}/book-type")
async def change_book_type(
    user_id: str,
    body: ChangeBookTypeBody,
    request: Request,
    # tenant_safe: change_user_book_type calls assert_user_in_scope.
    admin: User = Depends(require_permission("trades.manage", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    return await book_service.change_user_book_type(
        user_id, body.book_type, admin.id, ip, db, scope_admin=admin
    )


# ── LP Settings ──

@router.get("/lp-status")
async def lp_status(
    admin: User = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.get_lp_status(db)


@router.get("/lp-settings")
async def lp_settings(
    admin: User = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.get_lp_settings(db)


@router.put("/lp-settings")
async def save_lp_settings(
    body: LPSettingsBody,
    request: Request,
    admin: User = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    return await book_service.save_lp_settings(body.api_url, body.ws_url, body.api_key, body.api_secret, admin.id, ip, db)


@router.post("/test-lp")
async def test_lp(
    admin: User = Depends(get_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.test_lp_connection(db)


# ── A-Book Trades ──

@router.get("/a-book/positions")
async def abook_positions(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    # tenant_safe: get_abook_positions applies the pool filter.
    admin: User = Depends(require_permission("trades.view", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.get_abook_positions(page, per_page, db, scope_admin=admin)


@router.get("/a-book/history")
async def abook_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    # tenant_safe: get_abook_history applies the pool filter.
    admin: User = Depends(require_permission("trades.view", tenant_safe=True)),
    db: AsyncSession = Depends(get_db),
):
    return await book_service.get_abook_history(page, per_page, db, scope_admin=admin)
