"""The desktop terminal's "New demo account", the MetaTrader way.

MT5 opens a demo account from one details form: no sign-up, no email code,
and the server answers with a login, a master password and an investor
password. This does the same.

Where the account lives. Every account belongs to a user, and a demo opened
like this has none, so they all sit under one platform-owned pool user. That
user can never be signed in to: its password is random and thrown away, and
account-number sign-in hands out a key for ONE account, never a user session
(services/account_login_service.py). So the accounts in the pool cannot see
each other. It is deliberately NOT the web's shared demo user
(demo@tuskaex.com): anyone can get a session for that one from "Try demo",
and it would list every account opened here.

What the trader typed is kept in demo_registrations (migration 0062).
"""
import logging
import secrets
from decimal import Decimal

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import hash_password
from packages.common.src.models import AccountGroup, DemoRegistration, TradingAccount, User
from packages.common.src.rate_limit import client_ip_for_inet, rate_limit_http
from packages.common.src.schemas import DemoAccountRequest

from .account_login_service import issue_account_key
from .account_service import generate_password_pair
from .auth_service import generate_account_number

logger = logging.getLogger("demo_account")

# Reserved: no one registers it (the TLD does not resolve), and the pool row is
# created here on first use.
DEMO_POOL_EMAIL = "desktop-demo-pool@tuskaex.invalid"

# The server MT5's dialog names. Demo and live are the same deployment here;
# the name tells the trader which kind of account they hold.
DEMO_SERVER_NAME = "TuskaEx-Demo"


async def _pool_user(db: AsyncSession) -> User:
    user = (await db.execute(select(User).where(User.email == DEMO_POOL_EMAIL))).scalar_one_or_none()
    if user:
        return user
    user = User(
        email=DEMO_POOL_EMAIL,
        password_hash=hash_password(secrets.token_urlsafe(48)),   # never used, never kept
        first_name="Desktop", last_name="Demo accounts",
        role="user", status="active", kyc_status="pending",
        is_demo=True, email_verified=True, two_factor_enabled=False,
    )
    db.add(user)
    await db.flush()
    return user


LIVE_SERVER_NAME = "TuskaEx-Live"


async def list_demo_groups(db: AsyncSession, live: bool = False) -> dict:
    """The account types for the details page's Account Type list: demo ones,
    or with live=True the real ones. Public: the form is shown before there is
    any account or session. Only what a type IS — the per-user leverage cap
    and minimum-deposit funding are decided when the account is opened."""
    rows = (await db.execute(
        select(AccountGroup)
        .where(AccountGroup.is_active == True, AccountGroup.is_demo == (not live))
        .order_by(AccountGroup.name)
    )).scalars().all()
    return {
        "items": [{
            "id": str(g.id),
            "name": g.name,
            "description": g.description or "",
            "leverage_default": int(g.leverage_default or 100),
            "max_leverage": int(g.max_leverage or g.leverage_default or 100),
            "minimum_deposit": float(g.minimum_deposit or 0),
            "swap_free": bool(g.swap_free),
        } for g in rows],
        "server": LIVE_SERVER_NAME if live else DEMO_SERVER_NAME,
    }


async def open_demo_account(req: DemoAccountRequest, request: Request, db: AsyncSession) -> dict:
    # Anyone can call this, so it is held to what a person needs: a few demo
    # accounts, not a few hundred.
    rate_limit_http(request, "demo-open", 5, 60.0)
    rate_limit_http(request, "demo-open-hour", 20, 3600.0)

    from packages.common.src.settings_store import get_bool_setting
    if await get_bool_setting("maintenance_mode", False):
        raise HTTPException(status_code=503, detail="Platform is under maintenance. Please try again later.")

    q = select(AccountGroup).where(AccountGroup.is_active == True, AccountGroup.is_demo == True)
    if req.account_group_id:
        q = q.where(AccountGroup.id == req.account_group_id)
    group = (await db.execute(q.order_by(AccountGroup.name).limit(1))).scalars().first()
    if group is None:
        raise HTTPException(status_code=400, detail="No demo account type is available.")

    max_lev = int(group.max_leverage or group.leverage_default or 100)
    lev = int(req.leverage) if req.leverage else int(group.leverage_default or max_lev)
    if lev > max_lev:
        raise HTTPException(status_code=400, detail=f"Leverage must be between 1 and {max_lev} for this account type.")

    owner = await _pool_user(db)
    master, investor = generate_password_pair()
    balance = Decimal(str(round(req.deposit, 2)))
    acc = TradingAccount(
        user_id=owner.id,
        account_group_id=group.id,
        account_number=generate_account_number(),
        balance=balance, equity=balance, free_margin=balance, margin_used=Decimal("0"),
        leverage=lev, currency="USD", is_demo=True, is_active=True,
        master_password_hash=hash_password(master),
        investor_password_hash=hash_password(investor),
    )
    db.add(acc)
    await db.flush()

    db.add(DemoRegistration(
        account_id=acc.id,
        full_name=req.full_name.strip(),
        email=str(req.email).strip().lower(),
        phone=(req.phone or "").strip() or None,
        country=(req.country or "").strip() or None,
        state=(req.state or "").strip() or None,
        city=(req.city or "").strip() or None,
        postal_code=(req.postal_code or "").strip() or None,
        address=(req.address or "").strip() or None,
        newsletter=bool(req.newsletter),
        ip_address=client_ip_for_inet(request),
    ))

    # Signed straight in on the master password, as MT5 is after Finish.
    api_key, api_secret = await issue_account_key(db, acc, read_only=False)
    await db.commit()

    logger.info("[DEMO-OPEN] %s opened for %s", acc.account_number, req.email)
    return {
        "account_id": str(acc.id),
        "account_number": acc.account_number,
        "account_group_name": group.name,
        "server": DEMO_SERVER_NAME,
        "leverage": lev,
        "balance": float(balance),
        "currency": "USD",
        "is_demo": True,
        # Shown once. Only their hashes are kept.
        "master_password": master,
        "investor_password": investor,
        "api_key": api_key,
        "api_secret": api_secret,
        "read_only": False,
    }
