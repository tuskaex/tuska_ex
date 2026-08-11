"""White-label branding and per-tenant outbound SMTP.

Second slice. These columns live on the sub-admin's `users` row; their clients
inherit the values by lookup through `assigned_admin_id`. Every column is
nullable and unread unless `BRANDING_ENABLED` is on, so applying this to a live
database changes nothing on its own.

smtp_password is stored as written. It is a credential the tenant supplies for
their own mail account and the sending code needs it in plaintext to
authenticate — there is no hash that would work. It is never returned by any
read endpoint and never written to an audit log.

Revision ID: 0058
Revises: 0057
"""
from alembic import op


revision = "0058"
down_revision = "0057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS brand_name       VARCHAR(80),
            ADD COLUMN IF NOT EXISTS logo_url         TEXT,
            ADD COLUMN IF NOT EXISTS support_email    VARCHAR(255),
            ADD COLUMN IF NOT EXISTS support_whatsapp VARCHAR(32),
            ADD COLUMN IF NOT EXISTS smtp_host        VARCHAR(255),
            ADD COLUMN IF NOT EXISTS smtp_port        INTEGER,
            ADD COLUMN IF NOT EXISTS smtp_user        VARCHAR(255),
            ADD COLUMN IF NOT EXISTS smtp_password    TEXT,
            ADD COLUMN IF NOT EXISTS smtp_from        VARCHAR(255),
            ADD COLUMN IF NOT EXISTS smtp_tls         BOOLEAN NOT NULL DEFAULT TRUE;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS smtp_tls,
            DROP COLUMN IF EXISTS smtp_from,
            DROP COLUMN IF EXISTS smtp_password,
            DROP COLUMN IF EXISTS smtp_user,
            DROP COLUMN IF EXISTS smtp_port,
            DROP COLUMN IF EXISTS smtp_host,
            DROP COLUMN IF EXISTS support_whatsapp,
            DROP COLUMN IF EXISTS support_email,
            DROP COLUMN IF EXISTS logo_url,
            DROP COLUMN IF EXISTS brand_name;
        """
    )
