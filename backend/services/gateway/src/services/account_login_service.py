"""Sign in to ONE trading account with its account number and password.

MetaTrader gives every trading account two passwords: the master password,
which trades, and the investor password, which can only look. This is that
sign-in.

What it hands back is deliberately NOT a user session. A JWT here would carry
the owner's identity, and every /api/v1 check is "does this account belong to
this user" — so a password given to an account manager, or an investor
password given to a client, would open the owner's other accounts, wallet,
profile and password change. Instead the sign-in is issued an algo API key,
which is bound to exactly one account by construction. An investor password
gets a key marked read_only, which every endpoint that changes anything
refuses (see api/algo_terminal.py and api/algo_connector.py).
"""
import hashlib
import logging
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.auth import verify_password
from packages.common.src.models import AlgoApiKey, TradingAccount, User
from packages.common.src.rate_limit import rate_limit_http
from packages.common.src.schemas import AccountLoginRequest

from .account_service import ACCOUNT_LOGIN_LABEL_INVESTOR, ACCOUNT_LOGIN_LABEL_MASTER
from .auth_service import STAFF_ROLES

logger = logging.getLogger("account_login")

# Concurrent sign-ins kept per account and password. MetaTrader lets several
# terminals sit on one account at once (an investor password shared with a few
# clients, say), so a sign-in must not log the previous one out; but each one
# leaves a key behind, and this caps how many stay live.
_KEEP_PER_LABEL = 10

# One message for every failure, so the endpoint cannot be used to learn which
# account numbers exist or which have a password set.
_BAD_LOGIN = "Invalid account number or password."


def _hash_secret(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _normalise_login(raw: str) -> str:
    login = raw.strip().upper()
    # MT5 logins are bare numbers; ours carry a "PT" prefix. Accept both.
    if login.isdigit():
        login = "PT" + login
    return login


async def account_login(req: AccountLoginRequest, request: Request, db: AsyncSession) -> dict:
    # Per IP, and per account so a distributed guess at one account is slowed
    # too. Tight on purpose: a person types a password a few times a minute.
    rate_limit_http(request, "account-login", 20, 60.0)
    login = _normalise_login(req.login)
    rate_limit_http(request, f"account-login:{login}", 10, 300.0)

    acc = (await db.execute(
        select(TradingAccount).where(func.upper(TradingAccount.account_number) == login)
    )).scalar_one_or_none()

    read_only = None
    if acc is not None:
        if acc.master_password_hash and verify_password(req.password, acc.master_password_hash):
            read_only = False
        elif acc.investor_password_hash and verify_password(req.password, acc.investor_password_hash):
            read_only = True
    if acc is None or read_only is None:
        raise HTTPException(status_code=401, detail=_BAD_LOGIN)

    if not acc.is_active:
        raise HTTPException(status_code=403, detail="This trading account is disabled.")
    user = await db.get(User, acc.user_id)
    if user is None or user.status in ("banned", "blocked", "suspended"):
        raise HTTPException(status_code=403, detail="This account is disabled.")
    if user.role in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Staff accounts cannot sign in to a trading account.")
    if user.role not in ("admin", "super_admin", "employee"):
        from packages.common.src.settings_store import get_bool_setting
        if await get_bool_setting("maintenance_mode", False):
            raise HTTPException(status_code=503, detail="Platform is under maintenance. Please try again later.")

    label = ACCOUNT_LOGIN_LABEL_INVESTOR if read_only else ACCOUNT_LOGIN_LABEL_MASTER
    api_key = "ak_" + secrets.token_hex(24)
    raw_secret = "as_" + secrets.token_hex(32)
    db.add(AlgoApiKey(
        user_id=acc.user_id,
        account_id=acc.id,
        api_key=api_key,
        secret_hash=_hash_secret(raw_secret),
        label=label,
        read_only=read_only,
        last_used_at=datetime.now(timezone.utc),
    ))
    await db.flush()

    # Keep the newest few sign-ins for this password, retire the rest.
    live = (await db.execute(
        select(AlgoApiKey)
        .where(AlgoApiKey.account_id == acc.id, AlgoApiKey.label == label,
               AlgoApiKey.is_active == True)
        .order_by(AlgoApiKey.created_at.desc())
    )).scalars().all()
    for old in live[_KEEP_PER_LABEL:]:
        old.is_active = False
    await db.commit()

    logger.info("[ACCOUNT-LOGIN] %s signed in (%s)", acc.account_number,
                "investor" if read_only else "master")
    return {
        "account_id": str(acc.id),
        "account_number": acc.account_number,
        "read_only": read_only,
        "api_key": api_key,
        "api_secret": raw_secret,
        "is_demo": bool(acc.is_demo),
        "currency": acc.currency or "USD",
        "balance": float(acc.balance or 0),
        "leverage": int(acc.leverage or 0),
    }
