"""Per-broker brand colour for the client-facing app.

A sub-admin (broker) can set a hex colour that the mobile app and web terminal
use as the primary accent. NULL means the app falls back to the platform's
default blue. Stored as uppercase #RRGGBB.

Revision ID: 0063
Revises: 0062
"""
from alembic import op
import sqlalchemy as sa

revision = "0063"
down_revision = "0062"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("brand_color", sa.String(7), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "brand_color")
