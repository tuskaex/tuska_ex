"""Fixtures for the sub-broker (white-label) suite.

These tests talk to a running gateway and admin service over HTTP and seed
the database they share, so they exercise the real routers, dependencies and
SQL. Run them through backend/tests/subbroker/run.sh, which starts a
throwaway Postgres, migrates it and starts both services.

Required env: DATABASE_URL, GATEWAY_URL, ADMIN_URL, JWT_SECRET,
ADMIN_JWT_SECRET (the same secrets the services were started with).
"""
from __future__ import annotations

import asyncio
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import jwt
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from packages.common.src.auth import create_access_token, hash_password
from packages.common.src.models import User

GATEWAY = os.environ["GATEWAY_URL"].rstrip("/")
ADMIN = os.environ["ADMIN_URL"].rstrip("/")
PASSWORD = "Sub-broker-test-1"


def _run(coro):
    return asyncio.run(coro)


async def _session_do(fn):
    engine = create_async_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as s:
            result = await fn(s)
            await s.commit()
            return result
    finally:
        await engine.dispose()


def sql(statement: str, **params):
    """Run one statement; returns all rows for a SELECT, else None."""
    async def go(s):
        res = await s.execute(text(statement), params)
        return res.fetchall() if res.returns_rows else None
    return _run(_session_do(go))


def make_user(**fields) -> uuid.UUID:
    tag = secrets.token_hex(4)
    defaults = dict(
        id=uuid.uuid4(),
        email=f"sbt-{tag}@example.com",
        password_hash=hash_password(PASSWORD),
        first_name="Test",
        last_name=tag,
        role="user",
        status="active",
        email_verified=True,
        main_wallet_balance=0,
    )
    defaults.update(fields)

    async def go(s):
        s.add(User(**defaults))
    _run(_session_do(go))
    return defaults["id"]


def user_headers(user_id: uuid.UUID, role: str = "user") -> dict:
    token, _ = create_access_token(str(user_id), role)
    return {"Authorization": f"Bearer {token}"}


def admin_headers(admin_id: uuid.UUID) -> dict:
    token = jwt.encode(
        {
            "type": "admin",
            "admin_id": str(admin_id),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        },
        os.environ["ADMIN_JWT_SECRET"],
        algorithm=os.environ.get("ADMIN_JWT_ALGORITHM", "HS256"),
    )
    return {"Authorization": f"Bearer {token}"}


def code() -> str:
    return "SBT" + secrets.token_hex(4).upper()


@pytest.fixture(scope="session")
def gw():
    with httpx.Client(base_url=GATEWAY, timeout=20) as c:
        yield c


@pytest.fixture(scope="session")
def adm():
    with httpx.Client(base_url=ADMIN, timeout=20) as c:
        yield c


@pytest.fixture(scope="session")
def world():
    """One super-admin with a platform logo, and brokers in the states the
    tests need. Created once, before any request, so the gateway's tenant
    host snapshot already sees the domains on its first refresh."""
    w = {}
    w["super"] = make_user(role="super_admin", logo_url="/api/v1/admin/branding/media/platform-logo.png")
    w["broker_a_code"] = code()
    w["broker_a"] = make_user(
        role="sub_admin", public_code=w["broker_a_code"], brand_name="Alpha Markets",
        logo_url="/api/v1/admin/branding/media/alpha.png", brand_color="#0A7C3E",
        support_email="help@alpha.example", custom_domain="alpha-sbt.example",
        custom_domain_status="READY",
    )
    w["broker_b_code"] = code()
    w["broker_b"] = make_user(role="sub_admin", public_code=w["broker_b_code"], brand_name="Bravo FX")
    w["broker_off_code"] = code()
    w["broker_off"] = make_user(
        role="sub_admin", public_code=w["broker_off_code"], brand_name="Locked Ltd",
        client_features={f: False for f in ("deposits", "withdrawals", "transfers", "copy_trading", "ib_program")},
    )
    w["broker_suspended_code"] = code()
    w["broker_suspended"] = make_user(
        role="sub_admin", public_code=w["broker_suspended_code"], brand_name="Gone Ltd",
        status="suspended", custom_domain="gone-sbt.example", custom_domain_status="READY",
    )
    w["client_a"] = make_user(assigned_admin_id=w["broker_a"])
    w["client_b"] = make_user(assigned_admin_id=w["broker_b"])
    w["client_off"] = make_user(assigned_admin_id=w["broker_off"])
    w["platform_client"] = make_user()
    for k in ("client_a", "client_b", "client_off", "platform_client"):
        w[k + "_email"] = sql("SELECT email FROM users WHERE id = :i", i=w[k])[0][0]
    return w
