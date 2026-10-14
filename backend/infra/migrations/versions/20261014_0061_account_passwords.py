"""MetaTrader-style passwords on a trading account.

A trading account can now carry two passwords of its own, as MT4/MT5 accounts
do:

  * master_password_hash   — signs in to THIS account with full trading.
  * investor_password_hash — signs in to THIS account read-only: positions,
                             orders and history are visible, nothing can be
                             placed, changed or closed.

Both are bcrypt, both nullable. An account without them is reached the way it
always was, with the owner's email and password.

A sign-in with either password is issued an algo API key for that one account
rather than a user session, so it can never reach the owner's other accounts,
wallet or profile. algo_api_keys.read_only marks the keys an investor password
was given; every endpoint that changes anything refuses them.

Revision ID: 0061
Revises: 0060
"""
from alembic import op

revision = "0061"
down_revision = "0060"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # One statement per execute: asyncpg runs each as a prepared statement and
    # refuses several in one ("cannot insert multiple commands").
    op.execute(
        """
        ALTER TABLE trading_accounts
            ADD COLUMN IF NOT EXISTS master_password_hash   VARCHAR(255),
            ADD COLUMN IF NOT EXISTS investor_password_hash VARCHAR(255)
        """
    )
    op.execute(
        "ALTER TABLE algo_api_keys ADD COLUMN IF NOT EXISTS read_only BOOLEAN NOT NULL DEFAULT FALSE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE algo_api_keys DROP COLUMN IF EXISTS read_only")
    op.execute("ALTER TABLE trading_accounts DROP COLUMN IF EXISTS investor_password_hash")
    op.execute("ALTER TABLE trading_accounts DROP COLUMN IF EXISTS master_password_hash")
