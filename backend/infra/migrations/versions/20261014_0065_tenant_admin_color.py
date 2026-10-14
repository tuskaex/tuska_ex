"""Per-broker admin-panel accent colour.

Separate from `brand_color` (which themes the client-facing app): this column
lets a broker have a different accent in their own admin panel. NULL means the
platform default. Stored as uppercase #RRGGBB.

Revision ID: 0065
Revises: 0064
"""
from alembic import op
import sqlalchemy as sa

revision = "0065"
down_revision = "0064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("admin_color", sa.String(7), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "admin_color")
