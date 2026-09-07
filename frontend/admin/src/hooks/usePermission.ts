'use client';

import { useAuthStore } from '@/stores/authStore';

/**
 * Whether the signed-in admin may do a thing.
 *
 * The backend has always enforced this — `require_permission` refuses what was
 * never granted, and that is the real boundary. What was missing is the UI
 * agreeing with it: a sub-admin without `users.add_fund` was still offered the
 * Add Fund button, opened the dialog, typed an amount, and only learned on
 * Confirm that they could not. That is the UI making a promise the API then
 * breaks.
 *
 * ── Fail-OPEN, deliberately ───────────────────────────────────────────────
 * This is the opposite of the backend's rule, and the difference is on purpose.
 *
 * When permissions are not known yet — `null`, the window between login and
 * /auth/me answering — `can()` returns true and nothing is hidden. Hiding on
 * unknown would flash controls out of existence on every page load, and worse,
 * a failed /auth/me would leave a legitimate admin staring at a panel with its
 * buttons missing and no way to tell that the cause was a network blip.
 *
 * Hiding a control is a hint, not a security boundary. Getting the hint wrong
 * for a second costs nothing, because the server still refuses. Removing a
 * button an admin is entitled to is the expensive failure.
 */
export function usePermission() {
  const admin = useAuthStore((s) => s.admin);
  const perms = admin?.permissions ?? null;

  /** True if the admin holds `permission` (or holds the `*` wildcard). */
  const can = (permission: string): boolean => {
    if (perms === null) return true;      // not known yet — hide nothing
    if (perms.includes('*')) return true; // super_admin
    return perms.includes(permission);
  };

  /** True only if EVERY permission is held — for a control that needs several. */
  const canAll = (...permissions: string[]): boolean => permissions.every(can);

  /** True if ANY is held — for a menu that opens onto several actions. */
  const canAny = (...permissions: string[]): boolean => permissions.some(can);

  return {
    can,
    canAll,
    canAny,
    /** False while /auth/me is still outstanding. Lets a caller wait rather
     *  than render, where flashing a control would be worse than a delay. */
    known: perms !== null,
  };
}
