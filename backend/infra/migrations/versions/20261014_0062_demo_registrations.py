"""Demo accounts opened from the desktop terminal's "New demo account".

MetaTrader opens a demo account from a details form alone: no sign-up, no
email code. The desktop does the same, and this table keeps what the trader
entered (name, contact, address, newsletter consent) against the account it
produced, so the broker has the lead and support has a name to match.

The accounts themselves sit under one platform-owned pool user that nobody can
sign in to as a user: they are reached only through their own master and
investor passwords (services/account_login_service.py), which are bound to one
account each. That is why the trader's details live here and not on a user row.

Revision ID: 0062
Revises: 0061
"""
from alembic import op

revision = "0062"
down_revision = "0061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS demo_registrations (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id    UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
            full_name     VARCHAR(200) NOT NULL,
            email         VARCHAR(255) NOT NULL,
            phone         VARCHAR(40),
            country       VARCHAR(100),
            state         VARCHAR(100),
            city          VARCHAR(100),
            postal_code   VARCHAR(20),
            address       TEXT,
            newsletter    BOOLEAN NOT NULL DEFAULT FALSE,
            ip_address    VARCHAR(64),
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    # One statement per execute: asyncpg runs each as a prepared statement and
    # refuses several in one ("cannot insert multiple commands").
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_demo_registrations_email ON demo_registrations (lower(email))"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS demo_registrations;")
