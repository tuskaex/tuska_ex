"""Per-sub-broker admin panel colour.

`users.admin_color`, uppercase `#RRGGBB`, set on a sub-admin row: the accent
of that broker's own admin panel. Separate from `brand_color`, which themes
their clients' user panel. NULL = falls back to brand_color, then the platform default.

Revision ID: 0065
Revises: 0064
"""
from alembic import op


revision = "0065"
down_revision = "0064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_color VARCHAR(7);")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS admin_color;")
