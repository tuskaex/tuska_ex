"""Per-tenant client feature switches.

One nullable JSONB column on the sub-admin's `users` row: which client-facing
features (deposits, withdrawals, transfers, copy_trading, ib_program) the
platform owner has switched OFF for that broker's clients, as
`{"deposits": false, ...}`. A missing key or NULL means enabled, so applying
this to a live database changes nothing on its own.

Revision ID: 0064
Revises: 0063
"""
from alembic import op


revision = "0064"
down_revision = "0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS client_features JSONB;")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS client_features;")
