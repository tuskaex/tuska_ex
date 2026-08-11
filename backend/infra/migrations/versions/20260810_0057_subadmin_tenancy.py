"""Sub-admin tenancy — client ownership, transfer telemetry, revenue split.

First slice of the white-label work. A sub-admin is a User with
role='sub_admin'. Clients are attached to one via `assigned_admin_id`.

`users.role` is VARCHAR but carries a CHECK constraint (`users_role_check`)
from the baseline, so the new value has to be added to it — a plain INSERT with
role='sub_admin' fails with CheckViolationError otherwise. The repo's pattern
for widening an enumerated set is drop-and-recreate the constraint, as done for
`*_scope_check` in revision 0053.

`assigned_admin_id IS NULL` means the platform pool, which is what every
existing row is. Nothing changes for anyone until a client is explicitly
assigned, so this migration is safe to apply to a live database ahead of the
feature being switched on.

The composite index is (assigned_admin_id, role) rather than assigned_admin_id
alone: every scoped query filters on both — "clients in my pool" is
`assigned_admin_id = :me AND role = 'user'`.

Revision ID: 0057
Revises: 0056
"""
from alembic import op


revision = "0057"
down_revision = "0056"
branch_labels = None
depends_on = None


_ROLES_BEFORE = "'user','admin','super_admin','ib','sub_broker','master_trader'"
_ROLES_AFTER = _ROLES_BEFORE + ",'sub_admin'"

# A sub-admin is two rows — users AND employees — because permissions are
# resolved from an Employee row. Both tables constrain `role`, so both have to
# learn the new value or creation fails halfway through the transaction.
_EMP_ROLES_BEFORE = (
    "'super_admin','trade_manager','support','finance','risk_manager','marketing'"
)
_EMP_ROLES_AFTER = _EMP_ROLES_BEFORE + ",'sub_admin'"


def upgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;")
    op.execute(
        f"ALTER TABLE users ADD CONSTRAINT users_role_check "
        f"CHECK (role IN ({_ROLES_AFTER}));"
    )
    op.execute("ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;")
    op.execute(
        f"ALTER TABLE employees ADD CONSTRAINT employees_role_check "
        f"CHECK (role IN ({_EMP_ROLES_AFTER}));"
    )
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS last_transferred_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS last_transferred_by UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS pnl_share_pct NUMERIC(5, 2);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_users_assigned_admin_role
            ON users (assigned_admin_id, role)
         WHERE assigned_admin_id IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_assigned_admin_role;")
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS pnl_share_pct,
            DROP COLUMN IF EXISTS last_transferred_by,
            DROP COLUMN IF EXISTS last_transferred_at,
            DROP COLUMN IF EXISTS created_by,
            DROP COLUMN IF EXISTS assigned_admin_id;
        """
    )
    # Demote before restoring the old constraint, or the ADD CONSTRAINT fails on
    # any surviving sub_admin row. Their Employee rows are left in place; they
    # grant nothing once the user can no longer reach the admin API.
    op.execute("UPDATE users SET role = 'user' WHERE role = 'sub_admin';")
    op.execute("DELETE FROM employees WHERE role = 'sub_admin';")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;")
    op.execute(
        f"ALTER TABLE users ADD CONSTRAINT users_role_check "
        f"CHECK (role IN ({_ROLES_BEFORE}));"
    )
    op.execute("ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;")
    op.execute(
        f"ALTER TABLE employees ADD CONSTRAINT employees_role_check "
        f"CHECK (role IN ({_EMP_ROLES_BEFORE}));"
    )
