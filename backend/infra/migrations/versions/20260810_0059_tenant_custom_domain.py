"""Tenant custom domains and branded referral codes.

Third slice. A tenant can either share a branded link on the platform's own
hostname (?ref=<public_code>) or point their own domain at us.

`custom_domain` is uniquely indexed but only over rows that have one — a partial
index, because almost every users row is NULL here and a plain UNIQUE would
still be fine in Postgres but would index tens of thousands of nulls for nothing.
The uniqueness matters: two tenants claiming the same apex would make host-based
tenant resolution ambiguous, and whichever row sorted first would silently win.

Same for `public_code`: it appears in a URL a stranger can type, so a collision
would hand one tenant's signups to another.

Revision ID: 0059
Revises: 0058
"""
from alembic import op


revision = "0059"
down_revision = "0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS public_code                  VARCHAR(20),
            ADD COLUMN IF NOT EXISTS custom_domain                VARCHAR(253),
            ADD COLUMN IF NOT EXISTS app_subdomain                VARCHAR(63),
            ADD COLUMN IF NOT EXISTS admin_subdomain              VARCHAR(63),
            ADD COLUMN IF NOT EXISTS custom_domain_status         VARCHAR(20),
            ADD COLUMN IF NOT EXISTS custom_domain_last_error     TEXT,
            ADD COLUMN IF NOT EXISTS custom_domain_provisioned_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS signup_origin                VARCHAR(20);
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_users_custom_domain
            ON users (custom_domain)
         WHERE custom_domain IS NOT NULL;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_users_public_code
            ON users (public_code)
         WHERE public_code IS NOT NULL;
        """
    )
    # Backfill tenants that existed before codes did, so the CODE column is
    # never blank for a row the operator can see. Derived from the row id rather
    # than random(), so re-running produces the same code instead of a new one.
    # A collision would violate the unique index above and fail this migration
    # loudly — which is the right outcome, and vanishingly unlikely at this scale.
    op.execute(
        """
        UPDATE users
           SET public_code = 'ADM' || lpad(
                 (((('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint & 2147483647)
                   % 90000000) + 10000000)::text, 8, '0')
         WHERE role = 'sub_admin' AND public_code IS NULL;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ux_users_public_code;")
    op.execute("DROP INDEX IF EXISTS ux_users_custom_domain;")
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS signup_origin,
            DROP COLUMN IF EXISTS custom_domain_provisioned_at,
            DROP COLUMN IF EXISTS custom_domain_last_error,
            DROP COLUMN IF EXISTS custom_domain_status,
            DROP COLUMN IF EXISTS admin_subdomain,
            DROP COLUMN IF EXISTS app_subdomain,
            DROP COLUMN IF EXISTS custom_domain,
            DROP COLUMN IF EXISTS public_code;
        """
    )
