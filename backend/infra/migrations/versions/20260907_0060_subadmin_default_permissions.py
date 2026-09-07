"""Give every existing sub-admin the permissions a new one now starts with.

The create form used to open with nothing ticked, so a tenant was born unable
to see a client, approve a deposit or credit an account, and the super-admin
had to find and tick roughly twenty boxes per tenant. That default is fixed
going forward — the form opens pre-ticked — but it only helps tenants created
after it, and the ones already on the platform stayed as they were: one had
eight permissions, another eleven, and their Users menus offered View Profile
and nothing else while the platform owner's offered nine actions.

This backfills them to the same starting set.

WHY NOT EMPLOYEE_ROLE_PERMISSIONS["sub_admin"]: because that would be
permanent. require_permission computes `role_perms | extra`, a union, so
anything named there is granted to every tenant forever and cannot be taken
away — a tenant granted two permissions would still be served everything in the
role. That is exactly why the role was emptied. Writing into extra_permissions
keeps every grant revocable per tenant, which is what a per-tenant commercial
decision needs.

WHAT IS AND IS NOT INCLUDED mirrors the create form:

  IN   the sections a broker needs to run their own book, and — deliberately —
       Adjust balances and Risk controls. require_user_in_scope confines both
       to the tenant's own pool; withholding them does not make the platform
       safer, it makes the tenant unable to operate.

  OUT  every platform-wide section (Config, Banks, Bonus, Banners, Social,
       Business, Analytics, Account types), which shows and edits data across
       every tenant. Out too: Delete clients, Log in as a client, and the three
       dealing-desk actions. Those stay a deliberate per-tenant grant.

Additive and idempotent: existing grants are preserved, re-running changes
nothing, and a tenant already holding more keeps it.

Revision ID: 0060
Revises: 0059
"""
from alembic import op

revision = "0060"
down_revision = "0059"
branch_labels = None
depends_on = None


# Frozen copy of DEFAULT_NEW_TENANT_PERMISSIONS from
# frontend/admin/src/app/(admin)/sub-admins/permissions.ts. A migration must
# describe the world at the moment it ran, so this is deliberately a copy and
# must NOT be re-pointed at that list if it changes later.
DEFAULTS = [
    "analytics.view",
    "audit_logs.view",
    "deposits.approve",
    "deposits.reject",
    "deposits.view",
    "kyc.manage",
    "kyc.view",
    "orders.view",
    "positions.view",
    "tickets.assign",
    "tickets.reply",
    "tickets.view",
    "trades.view",
    "users.add_fund",
    "users.ban",
    "users.block_trading",
    "users.deduct_fund",
    "users.kill_switch",
    "users.view",
    "withdrawals.approve",
    "withdrawals.reject",
    "withdrawals.view",
]


def upgrade() -> None:
    array_literal = ", ".join("'%s'" % p for p in DEFAULTS)
    op.execute(
        f"""
        UPDATE employees e
           SET extra_permissions = (
                 SELECT jsonb_agg(p ORDER BY p)
                   FROM (
                          SELECT jsonb_array_elements_text(
                                   COALESCE(e.extra_permissions, '[]'::jsonb)
                                 ) AS p
                          UNION
                          SELECT unnest(ARRAY[{array_literal}]::text[])
                        ) AS s
               )
         WHERE e.role = 'sub_admin'
        """
    )


def downgrade() -> None:
    """No-op, on purpose.

    The union is lossy: once applied there is no record of which permissions a
    tenant held beforehand, so removing the defaults would take away grants the
    super-admin had chosen deliberately. Revoking is a per-tenant decision and
    belongs in the permission form, not in a schema rollback.
    """
