"""Create (or reset) one admin and one trader login. Idempotent.

Run it INSIDE the gateway container — that image already has bcrypt,
SQLAlchemy, asyncpg and `packages.common` installed, and DATABASE_URL
points at the right database:

    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T \
      -e SEED_ADMIN_EMAIL=admin@example.com \
      -e SEED_ADMIN_PASSWORD='...' \
      -e SEED_USER_EMAIL=trader@example.com \
      -e SEED_USER_PASSWORD='...' \
      gateway python - < backend/scripts/seed_accounts.py

Either pair may be omitted — set only the vars for the account you want.

Re-running with the same email RESETS that account's password rather than
erroring, which is what makes this safe to use as a "I locked myself out"
recovery tool.

Passwords are checked against packages.common.src.password_policy — the
SAME validator the register/reset endpoints use. That is deliberate: a
seeded account must not be able to hold a password the application itself
would refuse to set, or you get an account that works today and can never
be rotated through the normal reset flow.

An admin here is a `users` row with role='super_admin', matching how
alembic 0002 seeds the default super-admin. `employees` rows are for the
scoped sub-admin roles and are not needed for admin-panel login.
"""
import asyncio
import os
import sys

import bcrypt
from sqlalchemy import text

from packages.common.src.database import AsyncSessionLocal
from packages.common.src.password_policy import validate_password_strength


async def _upsert(session, *, email: str, password: str, role: str,
                  first: str, last: str, kyc: str) -> str:
    """Insert the account, or reset the password if the email already
    exists. Returns 'created' or 'updated'.

    Deliberately NOT `ON CONFLICT (email)`: this table carries both a
    plain unique constraint on `email` and the expression index
    `ux_users_email_lower` on lower(email) (alembic 0018). Inferring the
    right arbiter between those two is fragile, and a case-differing row
    would slip past the plain constraint only to trip the lower() index.
    Matching on lower(email) explicitly sidesteps the whole question.
    """
    email = email.strip().lower()
    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()

    res = await session.execute(
        text(
            """
            UPDATE users
               SET password_hash     = :hash,
                   role              = :role,
                   status            = 'active',
                   email_verified    = TRUE,
                   email_verified_at = COALESCE(email_verified_at, NOW()),
                   updated_at        = NOW()
             WHERE lower(email) = :email
            """
        ).bindparams(hash=pw_hash, role=role, email=email)
    )
    if (res.rowcount or 0) > 0:
        return "updated"

    await session.execute(
        text(
            """
            INSERT INTO users (email, password_hash, first_name, last_name,
                               role, status, kyc_status,
                               email_verified, email_verified_at)
            VALUES (:email, :hash, :first, :last,
                    :role, 'active', :kyc, TRUE, NOW())
            """
        ).bindparams(email=email, hash=pw_hash, first=first, last=last,
                     role=role, kyc=kyc)
    )
    return "created"


def _pair(kind: str) -> tuple[str, str] | None:
    """Read SEED_<KIND>_EMAIL / _PASSWORD. Returns None if neither is set,
    exits if only one of the two is."""
    email = (os.environ.get(f"SEED_{kind}_EMAIL") or "").strip()
    password = os.environ.get(f"SEED_{kind}_PASSWORD") or ""
    if not email and not password:
        return None
    if not email or not password:
        sys.exit(f"ERROR: set BOTH SEED_{kind}_EMAIL and SEED_{kind}_PASSWORD.")
    try:
        validate_password_strength(password)
    except ValueError as e:
        sys.exit(
            f"ERROR: SEED_{kind}_PASSWORD rejected by the platform password "
            f"policy — {e}\n"
            "       This is the same rule the register/reset endpoints "
            "enforce; seeding around it would create an account whose "
            "password can never be re-set through the app."
        )
    return email, password


async def main() -> None:
    admin = _pair("ADMIN")
    user = _pair("USER")
    if not admin and not user:
        sys.exit(
            "Nothing to do. Set SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD and/or "
            "SEED_USER_EMAIL/SEED_USER_PASSWORD."
        )

    async with AsyncSessionLocal() as session:
        if admin:
            action = await _upsert(
                session, email=admin[0], password=admin[1],
                role="super_admin", first="Super", last="Admin",
                kyc="approved",
            )
            print(f"  admin  {admin[0]:<32} {action}")
        if user:
            action = await _upsert(
                session, email=user[0], password=user[1],
                role="user", first="Hari", last="Trader",
                kyc="pending",
            )
            print(f"  trader {user[0]:<32} {action}")
        await session.commit()

    print("\nDone. Admin signs in at admin.<domain>, trader at trade.<domain>.")
    print("The trader still has no trading account — open one from the app "
          "(Accounts -> Open Account) or from the admin panel.")


if __name__ == "__main__":
    asyncio.run(main())
