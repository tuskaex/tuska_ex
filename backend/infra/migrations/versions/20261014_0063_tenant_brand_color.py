"""Per-tenant theme colour.

One nullable column on the sub-admin's `users` row, next to the rest of the
white-label branding from 0058. Stored as an uppercase `#RRGGBB` string; NULL
means "use the platform's default accent". Nothing reads it until a tenant has
one set, so applying this to a live database changes nothing on its own.

Revision ID: 0063
Revises: 0062
"""
from alembic import op


revision = "0063"
down_revision = "0062"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7);")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS brand_color;")
