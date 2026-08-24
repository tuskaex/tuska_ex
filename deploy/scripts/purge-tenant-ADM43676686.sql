-- Purge the white-label tenant ADM43676686.
--
-- This repo is public, so the tenant is identified by their ADM code and row
-- id only. Neither is a secret; their email address is, and it is not here.
--
-- Verified against production before this file was written:
--   • exactly 1 users row with role='sub_admin'
--   • brand_name / custom_domain / logo_url all already EMPTY — there is no
--     white-label data left to clear, only the row itself
--   • clients = 0            (nobody to release)
--   • audit_logs refs = 0    (nothing to lose; this is why a hard delete is
--                             clean here, unlike the general case the app's
--                             soft delete_sub_admin guards against)
--   • FK sweep over all 53 foreign keys to users.id found exactly ONE
--     reference in the whole database: employees.user_id (NO ACTION), so
--     that row has to go first and nothing else is touched.
--
-- Backup taken before running:
--   /opt/tuskaex/backups/pre-tenant-purge-2026-08-24_0642.sql.gz
--   (pg_dump --data-only of users + employees)
--
-- Run on the server:
--   docker exec -i tuskaex-postgres-1 psql -U tuskaex -d tuskaex -X \
--     -f - < purge-tenant-ADM43676686.sql

\set ON_ERROR_STOP on
BEGIN;

-- Release any client pointing here. Expected 0, kept so the statement stays
-- correct even if someone got assigned between the check and the run.
UPDATE users
   SET assigned_admin_id   = NULL,
       last_transferred_at = now()
 WHERE assigned_admin_id = 'bd0abfda-9ccc-46f2-84ec-5dd9d7326bc5';

-- The only FK reference in the database. NO ACTION, so it precedes the user.
DELETE FROM employees
 WHERE user_id = 'bd0abfda-9ccc-46f2-84ec-5dd9d7326bc5'
 RETURNING id AS deleted_employee, role;

-- The tenant row itself. The role guard means a wrong id can only ever delete
-- nothing — never a real trader and never an admin.
DELETE FROM users
 WHERE id   = 'bd0abfda-9ccc-46f2-84ec-5dd9d7326bc5'
   AND role = 'sub_admin'
 RETURNING id AS deleted_user, email, public_code;

COMMIT;

-- Verification: all three must come back 0.
SELECT
  (SELECT count(*) FROM users WHERE role = 'sub_admin')            AS sub_admins_left,
  (SELECT count(*) FROM users
    WHERE brand_name IS NOT NULL
       OR custom_domain IS NOT NULL
       OR logo_url IS NOT NULL)                                    AS branded_rows_left,
  (SELECT count(*) FROM users u
    WHERE u.assigned_admin_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users p
                       WHERE p.id = u.assigned_admin_id))          AS orphan_pool_refs;
