"""Per-broker client-feature switches.

A super-admin can disable specific features (deposits, withdrawals, transfers,
copy_trading, ib_program) for an individual broker's client pool. The gateway's
`require_client_feature` dependency enforces these at the API level. A missing
key or NULL means the feature is enabled — no existing broker is affected by
this migration.

Revision ID: 0064
Revises: 0063
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0064"
down_revision = "0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("client_features", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "client_features")
