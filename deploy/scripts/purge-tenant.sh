#!/usr/bin/env bash
#
# DESTRUCTIVE — removes a white-label tenant (sub-admin) and its branding.
#
# A tenant is NOT a table. It is one `users` row with role='sub_admin', the
# branding/domain columns on that same row (migrations 0057-0059), and one
# `employees` row carrying its permissions. So "delete the tenant data" has two
# honest meanings and this script makes you pick:
#
#   (default)   Clear every white-label column, release the tenant's clients,
#               deactivate the employee row, mark the user 'suspended'. The
#               users row and the full audit trail SURVIVE. You lose the
#               branding values and nothing else.
#
#   --purge     Hard-delete the users row. 53 foreign keys point at users.id
#               and only 16 are ON DELETE CASCADE, so the other 37 have to be
#               cleared first. They are discovered from the pg catalog rather
#               than a hand-written list — that list would rot the next time a
#               migration adds a table. Nullable FK columns are SET NULL so
#               audit entries survive without attribution; NOT NULL ones mean
#               the row is per-user data and it goes with the user.
#               IRREVERSIBLE.
#
# Clients are NEVER deleted in either mode. They are real traders with
# balances, so they are released to the platform pool (assigned_admin_id =
# NULL) — exactly what the app's own delete_sub_admin does.
#
# Usage (on the server):
#   ./purge-tenant.sh ADM43676686                  # clear branding, keep row
#   ./purge-tenant.sh ADM43676686 --purge          # hard delete the row
#   ./purge-tenant.sh tenant@example.com --purge   # email works too
#
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/tuskaex}"
COMPOSE="docker compose -f $REPO_DIR/docker-compose.yml -f $REPO_DIR/docker-compose.prod.yml"
PGUSER_="${POSTGRES_USER:-tuskaex}"
PGDB_="${POSTGRES_DB:-tuskaex}"

TARGET="${1:-}"
MODE="wipe-branding"
[ "${2:-}" = "--purge" ] && MODE="purge"

if [ -z "$TARGET" ]; then
  echo "Usage: $0 <public_code|email> [--purge]" >&2
  echo "Without --purge: clears branding but keeps the row + audit trail." >&2
  exit 1
fi

# Single-quoted SQL literals below. Reject anything that could break out of
# one rather than trying to escape it — the only legitimate inputs are an
# ADM-code or an email address.
case "$TARGET" in
  *[\'\;\\]*|*' '*)
    echo "✗ Refusing: target may only contain code/email characters." >&2
    exit 1 ;;
esac

psql_() { $COMPOSE exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PGUSER_" -d "$PGDB_" "$@"; }

MATCH="role = 'sub_admin' AND (public_code = '$TARGET' OR lower(email) = lower('$TARGET'))"

# ── Resolve and display the target before touching anything ──────────
echo "▶ Looking up tenant: $TARGET"
psql_ -X <<SQL
\pset border 2
SELECT u.id, u.public_code, u.email, u.status,
       u.brand_name, u.custom_domain, u.custom_domain_status,
       (SELECT count(*) FROM users c WHERE c.assigned_admin_id = u.id) AS clients,
       (SELECT count(*) FROM audit_logs a WHERE a.admin_id = u.id)     AS audit_rows
  FROM users u
 WHERE $MATCH;
SQL

FOUND=$(psql_ -X -t -A -c "SELECT count(*) FROM users u WHERE $MATCH;" | tr -d '[:space:]')
if [ "$FOUND" != "1" ]; then
  echo "✗ Expected exactly 1 matching sub_admin, found $FOUND. Aborting." >&2
  exit 1
fi

echo
echo "╔════════════════════════════════════════════════════════════════╗"
if [ "$MODE" = "purge" ]; then
  echo "║  MODE: --purge   HARD DELETE of the users row. IRREVERSIBLE.    ║"
  echo "║  Audit entries survive but lose attribution (admin_id → NULL).  ║"
else
  echo "║  MODE: default   Clears the white-label columns only.           ║"
  echo "║  The users row and the full audit trail are kept.               ║"
fi
echo "║  Clients are released to the platform pool, never deleted.      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo
read -r -p 'Type "PURGE" (uppercase) to confirm: ' CONFIRM
[ "$CONFIRM" = "PURGE" ] || { echo "Aborted."; exit 1; }

echo
echo "[1/3] Backup first..."
"$REPO_DIR/deploy/scripts/backup-db.sh"

echo
echo "[2/3] Applying ($MODE)..."

if [ "$MODE" = "wipe-branding" ]; then
psql_ <<SQL
BEGIN;
CREATE TEMP TABLE _t AS SELECT id FROM users u WHERE $MATCH;

-- Release clients (same as the app's delete_sub_admin).
UPDATE users SET assigned_admin_id = NULL,
                 last_transferred_at = now()
 WHERE assigned_admin_id IN (SELECT id FROM _t);

-- Every white-label column added by migrations 0058 + 0059.
UPDATE users SET
  brand_name = NULL, logo_url = NULL,
  support_email = NULL, support_whatsapp = NULL,
  smtp_host = NULL, smtp_port = NULL, smtp_user = NULL,
  smtp_password = NULL, smtp_from = NULL, smtp_tls = TRUE,
  public_code = NULL, custom_domain = NULL,
  app_subdomain = NULL, admin_subdomain = NULL,
  custom_domain_status = NULL, custom_domain_last_error = NULL,
  custom_domain_provisioned_at = NULL,
  status = 'suspended'
 WHERE id IN (SELECT id FROM _t);

-- Permissions resolve from the employees row; deactivate it.
UPDATE employees SET is_active = FALSE WHERE user_id IN (SELECT id FROM _t);
COMMIT;
SQL

else
psql_ <<SQL
BEGIN;
CREATE TEMP TABLE _t AS SELECT id FROM users u WHERE $MATCH;

-- Clients first, so no row is left pointing at a deleted tenant.
UPDATE users SET assigned_admin_id = NULL,
                 last_transferred_at = now()
 WHERE assigned_admin_id IN (SELECT id FROM _t);

-- employees.user_id is a plain (non-CASCADE) FK; drop it explicitly.
DELETE FROM employees WHERE user_id IN (SELECT id FROM _t);

-- Every remaining non-CASCADE FK to users.id, read from the catalog.
-- Self-references on `users` (assigned_admin_id / created_by /
-- last_transferred_by) are covered here too, which a hand-written list
-- reliably forgets.
DO \$\$
DECLARE
  r          record;
  tenant_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO tenant_ids FROM _t;

  FOR r IN
    SELECT c.conrelid::regclass::text AS tbl,
           a.attname                  AS col,
           a.attnotnull               AS notnull
      FROM pg_constraint c
      JOIN pg_attribute  a ON a.attrelid = c.conrelid
                          AND a.attnum   = c.conkey[1]
     WHERE c.contype   = 'f'
       AND c.confrelid = 'users'::regclass
       AND array_length(c.conkey, 1) = 1
       AND c.confdeltype <> 'c'          -- CASCADE handles itself
  LOOP
    IF r.notnull THEN
      EXECUTE format('DELETE FROM %s WHERE %I = ANY(\$1)', r.tbl, r.col)
        USING tenant_ids;
      RAISE NOTICE 'deleted rows in %.% (NOT NULL)', r.tbl, r.col;
    ELSE
      EXECUTE format('UPDATE %s SET %I = NULL WHERE %I = ANY(\$1)',
                     r.tbl, r.col, r.col)
        USING tenant_ids;
      RAISE NOTICE 'nulled %.%', r.tbl, r.col;
    END IF;
  END LOOP;
END
\$\$;

DELETE FROM users WHERE id IN (SELECT id FROM _t);
COMMIT;
SQL
fi

echo
echo "[3/3] Verifying..."
psql_ -X <<SQL
\pset border 2
SELECT count(*) AS sub_admins_left FROM users WHERE role = 'sub_admin';
SELECT count(*) AS branded_rows_left FROM users
 WHERE brand_name IS NOT NULL OR custom_domain IS NOT NULL OR logo_url IS NOT NULL;
SELECT count(*) AS orphan_pool_refs FROM users u
 WHERE u.assigned_admin_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM users p WHERE p.id = u.assigned_admin_id);
SQL

echo
echo "✓ Done ($MODE)."
echo "  Logo files are NOT in the DB and are not removed here:"
echo "    rm -f $REPO_DIR/backend/uploads/branding/*"
echo "  Tenant host resolution is cached in Redis — restart to drop it:"
echo "    $COMPOSE restart gateway admin-api"
