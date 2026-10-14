"""Terminal endpoints on an account-bound API key.

The desktop terminal reads positions, orders and history, and places pending
orders, edits brackets and closes positions, through /api/v1 with a user JWT.
A sign-in with an account's own master or investor password has no JWT — it
holds an API key for that one account (services/account_login_service.py) —
so these are the same operations, authenticated by the key and confined to
the key's account:

  GET    /api/algo/terminal/session
  GET    /api/algo/terminal/positions?status=open
  GET    /api/algo/terminal/orders?status=pending
  GET    /api/algo/terminal/trades?page=&per_page=
  GET    /api/algo/terminal/transactions
  POST   /api/algo/terminal/orders                    trading
  PUT    /api/algo/terminal/orders/{id}               trading
  DELETE /api/algo/terminal/orders/{id}               trading
  PUT    /api/algo/terminal/positions/{id}            trading
  POST   /api/algo/terminal/positions/{id}/close      trading

Each one calls the same service function as its /api/v1 twin, so the rules —
margin, market hours, SL/TP levels, maintenance — are not reimplemented here.
What this file adds is the confinement: the account always comes from the
key, never from the request, and an order or position named by id must belong
to that account. "trading" entries refuse a read_only key (an investor
password).
"""
import hashlib
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import _get_user_status
from packages.common.src.database import get_db
from packages.common.src.models import AlgoApiKey, Order, Position, TradingAccount
from packages.common.src.rate_limit import client_ip_for_inet, rate_limit_http
from packages.common.src.schemas import (
    ClosePositionRequest, ModifyOrderRequest, ModifyPositionRequest, PlaceOrderRequest,
)

from ..services import portfolio_service, trading_service, wallet_service

router = APIRouter()

READ_ONLY_DETAIL = ("Signed in with the investor password: this account is read-only. "
                    "Sign in with the master password to trade.")


class KeySession:
    def __init__(self, key: AlgoApiKey, account: TradingAccount):
        self.key = key
        self.account = account

    @property
    def user_id(self) -> UUID:
        return self.account.user_id

    @property
    def account_id(self) -> UUID:
        return self.account.id

    def require_trading(self) -> None:
        if self.key.read_only:
            raise HTTPException(status_code=403, detail=READ_ONLY_DETAIL)


async def key_session(
    x_api_key: str = Header(default="", alias="X-Api-Key"),
    x_api_secret: str = Header(default="", alias="X-Api-Secret"),
    db: AsyncSession = Depends(get_db),
) -> KeySession:
    if not x_api_key or not x_api_secret:
        raise HTTPException(status_code=401, detail="Missing X-Api-Key or X-Api-Secret")
    key = (await db.execute(
        select(AlgoApiKey).where(AlgoApiKey.api_key == x_api_key, AlgoApiKey.is_active == True)
    )).scalar_one_or_none()
    if not key or key.secret_hash != hashlib.sha256(x_api_secret.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Invalid API credentials")
    account = await db.get(TradingAccount, key.account_id)
    if not account or not account.is_active:
        raise HTTPException(status_code=403, detail="Trading account is inactive")
    # The owner's ban has to reach a key as it reaches a JWT.
    if await _get_user_status(account.user_id) in ("banned", "blocked", "suspended"):
        raise HTTPException(status_code=403, detail="Account is disabled")
    key.last_used_at = datetime.now(timezone.utc)
    await db.commit()
    return KeySession(key, account)


async def _own_order(order_id: UUID, s: KeySession, db: AsyncSession) -> None:
    order = await db.get(Order, order_id)
    if not order or order.account_id != s.account_id:
        raise HTTPException(status_code=404, detail="Order not found")


async def _own_position(position_id: UUID, s: KeySession, db: AsyncSession) -> None:
    pos = await db.get(Position, position_id)
    if not pos or pos.account_id != s.account_id:
        raise HTTPException(status_code=404, detail="Position not found")


# ── reads ──────────────────────────────────────────────────────────────────

@router.get("/session")
async def session_info(s: KeySession = Depends(key_session)):
    """Which account this key is, and whether it may trade."""
    return {
        "account_id": str(s.account_id),
        "account_number": s.account.account_number,
        "read_only": bool(s.key.read_only),
        "is_demo": bool(s.account.is_demo),
        "currency": s.account.currency or "USD",
    }


@router.get("/positions")
async def list_positions(
    status: str = "open",
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    return await trading_service.list_positions(
        account_id=s.account_id, user_id=s.user_id, status=status, db=db,
    )


@router.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    return await trading_service.list_orders(
        account_id=s.account_id, user_id=s.user_id, status=status, db=db,
    )


@router.get("/trades")
async def trade_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    return await portfolio_service.trade_history(
        user_id=s.user_id, account_id=s.account_id, symbol=None, side=None,
        date_from=None, date_to=None, page=page, per_page=per_page, db=db,
    )


@router.get("/transactions")
async def list_transactions(
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    return await wallet_service.list_transactions(
        user_id=s.user_id, account_id=s.account_id, db=db,
    )


# ── trading ────────────────────────────────────────────────────────────────

class TerminalOrderRequest(BaseModel):
    """PlaceOrderRequest without account_id: the account is the key's."""
    symbol: str
    order_type: str = Field(..., pattern="^(market|limit|stop|stop_limit)$")
    side: str = Field(..., pattern="^(buy|sell)$")
    lots: Decimal = Field(gt=0, le=100)
    price: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None
    stop_limit_price: Optional[Decimal] = None
    comment: Optional[str] = None
    magic_number: Optional[int] = None


@router.post("/orders", status_code=201)
async def place_order(
    body: TerminalOrderRequest,
    request: Request,
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    s.require_trading()
    rate_limit_http(request, "orders-place", 120, 60.0)
    req = PlaceOrderRequest(account_id=s.account_id, **body.model_dump())
    return await trading_service.place_order(
        req=req, request=request, user_id=s.user_id,
        ip_address=client_ip_for_inet(request), db=db,
    )


@router.put("/orders/{order_id}")
async def modify_order(
    order_id: UUID,
    req: ModifyOrderRequest,
    request: Request,
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    s.require_trading()
    rate_limit_http(request, "orders-modify", 120, 60.0)
    await _own_order(order_id, s, db)
    return await trading_service.modify_order(order_id=order_id, req=req, user_id=s.user_id, db=db)


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: UUID,
    request: Request,
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    s.require_trading()
    rate_limit_http(request, "orders-cancel", 120, 60.0)
    await _own_order(order_id, s, db)
    return await trading_service.cancel_order(order_id=order_id, user_id=s.user_id, db=db)


@router.put("/positions/{position_id}")
async def modify_position(
    position_id: UUID,
    req: ModifyPositionRequest,
    request: Request,
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    s.require_trading()
    rate_limit_http(request, "positions-modify", 120, 60.0)
    await _own_position(position_id, s, db)
    return await trading_service.modify_position(
        position_id=position_id, req=req, user_id=s.user_id, db=db,
    )


@router.post("/positions/{position_id}/close")
async def close_position(
    position_id: UUID,
    request: Request,
    req: ClosePositionRequest = ClosePositionRequest(),
    s: KeySession = Depends(key_session),
    db: AsyncSession = Depends(get_db),
):
    s.require_trading()
    rate_limit_http(request, "positions-close", 120, 60.0)
    await _own_position(position_id, s, db)
    return await trading_service.close_position(
        position_id=position_id, req=req, user_id=s.user_id, db=db,
    )
