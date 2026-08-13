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
 * ── WHY SOME ROWS ARE NOT GRANTABLE ───────────────────────────────────────
 * The admin API fails closed for sub-admins: `require_permission(tenant_safe=)`
 * refuses them any route not explicitly marked pool-scoped. A section can only
 * carry that mark once its queries filter to the caller's own clients — see
 * dashboard_service.scope_ids for what that takes.
 *
 * The rest are platform-wide by nature. Account types, Config, Banks, Book
 * Management, Business, Social and the marketing sections hold data shared
 * across every tenant — a sub-admin editing spreads or charges would move them
 * for the whole platform, including the operator's own clients. Employees,
 * Sub-admins, Admin audit logs and Settings are the platform's own
 * administration.
 *
 * Those rows are still LISTED, because the operator asked "which of my menu can
 * I delegate?" and a silently-shortened list answers a different question. They
 * are rendered disabled with the reason, rather than as checkboxes that write a
 * permission string and change nothing — that is the shape this file had
 * before, and it made grants look effective when they were not.
 *
 * When a section is made tenant-safe, flip `available` here in the same commit
 * as the backend change, or the two drift apart again.
 */
export interface PermissionGroup {
  key: string;
  label: string;
  hint?: string;
  perms: string[];
  /** Destructive or money-moving — rendered apart from the routine ones. */
  sensitive?: boolean;
  /** False ⇒ platform-wide; shown but not grantable. Defaults to true. */
  available?: boolean;
  /** Why it cannot be delegated. Required when `available` is false. */
  unavailableReason?: string;
}

const PLATFORM_WIDE = 'Platform-wide — holds every tenant’s data';
const PLATFORM_ADMIN = 'Platform administration';

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
    perms: [],
    available: false,
    unavailableReason: 'Platform risk book',
  },
  {
    key: 'deposits',
    label: 'Deposits',
    // Both sidebar entries read `deposits.view`, so this one tick opens both.
    hint: 'Review and approve incoming funds — also opens Transactions',
    perms: ['deposits.view', 'deposits.approve', 'deposits.reject'],
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    hint: 'Review and approve payouts',
    perms: ['withdrawals.view', 'withdrawals.approve', 'withdrawals.reject'],
  },
  {
    key: 'banks',
    label: 'Banks',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_WIDE,
  },
  {
    key: 'account_types',
    label: 'Account types',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_WIDE,
  },
  {
    key: 'config',
    label: 'Config',
    perms: [],
    available: false,
    unavailableReason: 'Charges, spreads and swaps — shared by every tenant',
  },
  {
    key: 'social',
    label: 'Social',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_WIDE,
  },
  {
    key: 'business',
    label: 'Business',
    perms: [],
    available: false,
    unavailableReason: 'IB, MLM and copy programs run platform-wide',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    perms: [],
    available: false,
    unavailableReason: 'Not pool-scoped yet — Dashboard covers their own numbers',
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
    perms: [],
    available: false,
    unavailableReason: 'Every admin’s actions, across all tenants',
  },
  {
    key: 'bonus',
    label: 'Bonus',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_WIDE,
  },
  {
    key: 'banners',
    label: 'Banners',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_WIDE,
  },
  {
    key: 'support',
    label: 'Support',
    hint: 'Read and reply to their clients’ tickets',
    perms: ['tickets.view', 'tickets.reply', 'tickets.assign'],
  },
  {
    key: 'employees',
    label: 'Employees',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_ADMIN,
  },
  {
    key: 'sub_admins',
    label: 'Sub-admins',
    perms: [],
    available: false,
    unavailableReason: 'The tenant list itself',
  },
  {
    key: 'white_label',
    label: 'White-label',
    perms: [],
    available: false,
    unavailableReason: 'Always on — every tenant manages their own brand',
  },
  {
    key: 'settings',
    label: 'Settings',
    perms: [],
    available: false,
    unavailableReason: PLATFORM_ADMIN,
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
