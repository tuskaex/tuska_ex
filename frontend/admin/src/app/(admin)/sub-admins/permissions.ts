/**
 * The admin sidebar, as a permission form.
 *
 * One row per section of the super-admin's own sidebar, in the same order, so
 * granting reads like pointing at the menu. The backend speaks in dotted
 * strings (`users.view`, `deposits.approve`); a row grants the whole set behind
 * one decision, because making the operator work out that "handle deposits"
 * means deposits.view + deposits.approve + deposits.reject produced sub-admins
 * whose menu opened and whose buttons then failed.
 *
 * ── TWO KINDS OF GRANT, AND THE DIFFERENCE MATTERS ────────────────────────
 * Pool-scoped rows show the sub-admin THEIR OWN clients: Users, Trades,
 * Deposits, Support, Audit logs, Dashboard. Their queries filter on the pool,
 * so a tenant sees a tenant's worth of data.
 *
 * Rows marked `platformWide` show EVERY tenant's data on that page, and in the
 * case of Config, edits apply to the whole platform — a sub-admin who changes a
 * spread changes it for the operator's own clients too. They are grantable
 * because the platform owner asked for them to be, and they carry that warning
 * in their hint so the tick is never an accident.
 *
 * ── WHAT IS NOT LISTED, AND WHY ───────────────────────────────────────────
 * Employees, Sub-admins and Settings are the platform's own administration.
 * They are guarded by `get_platform_admin` and `_only_super_admin` rather than
 * by the permission factory, so no permission reaches them and offering a row
 * would only mislead. White-label authorises on brand ownership, so every
 * tenant already has it and there is nothing to grant. Banks, Bonus and Banners
 * were dropped at the operator's request.
 *
 * When a platform-wide section is later pool-scoped, drop its `platformWide`
 * flag in the same commit as the backend change, or the warning outlives the
 * problem.
 */
export interface PermissionGroup {
  key: string;
  label: string;
  hint?: string;
  perms: string[];
  /** Destructive or money-moving — rendered apart from the routine ones. */
  sensitive?: boolean;
  /** False ⇒ guarded outside require_permission; shown but not grantable.
   *  No row sets it today — every listed section is grantable — but the render
   *  path honours it, so a section that gains a hard guard can be surfaced
   *  honestly instead of silently disappearing. */
  available?: boolean;
  /** Why it cannot be delegated. Required when `available` is false. */
  unavailableReason?: string;
  /** Grantable, but the page shows EVERY tenant's data, not just this one's. */
  platformWide?: boolean;
}

/** Sidebar order, top to bottom. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    hint: 'Headline numbers for their own clients only',
    perms: ['analytics.view'],
  },
  {
    key: 'users',
    label: 'Users',
    hint: 'See and open client accounts in their pool',
    perms: ['users.view'],
  },
  {
    key: 'kyc',
    label: 'Identity verification',
    hint: 'Approve or reject identity documents',
    perms: ['kyc.view', 'kyc.manage'],
  },
  {
    key: 'trading',
    label: 'Trades',
    hint: 'Read positions, orders and trade history',
    perms: ['trades.view', 'positions.view', 'orders.view'],
  },
  {
    key: 'book',
    label: 'Book Management',
    hint: '⚠ Platform risk book — shows every tenant',
    perms: ['trades.view'],
    platformWide: true,
  },
  {
    key: 'deposits',
    label: 'Deposits',
    // Both sidebar entries read `deposits.view`, so this one tick opens both.
    hint: 'Review and approve incoming funds',
    perms: ['deposits.view', 'deposits.approve', 'deposits.reject'],
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    hint: 'Review and approve payouts',
    perms: ['withdrawals.view', 'withdrawals.approve', 'withdrawals.reject'],
  },
  {
    key: 'account_types',
    label: 'Account types',
    hint: '⚠ Platform account tiers — edits apply to everyone',
    perms: ['config.view'],
    platformWide: true,
  },
  {
    key: 'config',
    label: 'Config',
    hint: '⚠ Charges, spreads, swaps — edits apply platform-wide',
    perms: ['config.view'],
    platformWide: true,
  },
  {
    key: 'social',
    label: 'Social',
    hint: '⚠ Platform-wide — shows every tenant',
    perms: ['social.view', 'social.manage'],
    platformWide: true,
  },
  {
    key: 'business',
    label: 'Business',
    hint: '⚠ IB, MLM and copy programs — shows every tenant',
    perms: ['ib.view', 'ib.manage'],
    platformWide: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    hint: '⚠ Platform totals — not scoped to their pool',
    perms: ['analytics.view', 'exposure.view'],
    platformWide: true,
  },
  {
    key: 'ledger',
    label: 'Audit logs',
    hint: 'Read the activity trail for their own clients',
    perms: ['audit_logs.view'],
  },
  {
    key: 'admin_audit',
    label: 'Admin audit logs',
    hint: '⚠ Every admin’s actions, across all tenants',
    perms: ['audit_logs.view'],
    platformWide: true,
  },
  {
    key: 'support',
    label: 'Support',
    hint: 'Read and reply to their clients’ tickets',
    perms: ['tickets.view', 'tickets.reply', 'tickets.assign'],
  },

  {
    key: 'funds',
    label: 'Adjust balances',
    hint: 'Add or deduct funds on a client account',
    perms: ['users.add_fund', 'users.deduct_fund'],
    sensitive: true,
  },
  {
    key: 'risk',
    label: 'Risk controls',
    hint: 'Ban, block trading, kill switch',
    perms: ['users.ban', 'users.block_trading', 'users.kill_switch'],
    sensitive: true,
  },
  {
    key: 'place_orders',
    label: 'Place orders for clients',
    perms: ['trades.create'],
    sensitive: true,
  },
  {
    key: 'edit_trades',
    label: 'Edit trades',
    hint: 'Correct a position',
    perms: ['trades.modify'],
    sensitive: true,
  },
  {
    key: 'close_trades',
    label: 'Close trades',
    perms: ['trades.close'],
    sensitive: true,
  },
];

export function isGrantable(group: PermissionGroup): boolean {
  return group.available !== false && group.perms.length > 0;
}

/** A group counts as on only when every string in it is granted — a half-granted
 *  group would show as enabled while silently failing on some action. */
export function groupChecked(group: PermissionGroup, granted: string[]): boolean {
  return group.perms.length > 0 && group.perms.every((p) => granted.includes(p));
}

export function toggleGroup(group: PermissionGroup, granted: string[]): string[] {
  if (!isGrantable(group)) return granted;
  const on = groupChecked(group, granted);
  return on
    ? granted.filter((p) => !group.perms.includes(p))
    : Array.from(new Set([...granted, ...group.perms]));
}
