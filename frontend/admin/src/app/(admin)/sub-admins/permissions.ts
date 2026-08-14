/**
 * The super-admin's own sidebar, as a permission form.
 *
 * One row per section, same names, same order, so granting reads like pointing
 * at the menu. The backend speaks in dotted strings (`users.view`,
 * `deposits.approve`); a row grants the whole set behind one decision, because
 * making the operator work out that "handle deposits" means deposits.view +
 * deposits.approve + deposits.reject produced sub-admins whose menu opened and
 * whose buttons then failed.
 *
 * Two sections are deliberately absent. Sub-admins is the tenant list itself —
 * a tenant who can mint tenants is not a tenant. White-label authorises on brand
 * ownership rather than on a permission, so every tenant already has it and
 * there is nothing to grant. Both stay with the platform owner.
 *
 * ── ownedByTenant: THE DISTINCTION THAT MATTERS ───────────────────────────
 * The goal is that a sub-admin is a separate broker: their domain, their users,
 * their book, nothing to do with the parent platform.
 *
 * Rows WITHOUT `platformWide` already behave that way — their queries filter to
 * the sub-admin's own pool, so the page shows a tenant's worth of data.
 *
 * Rows WITH `platformWide` do NOT, yet. The tables behind them
 * (charge_configs, spread_configs, swap_configs, banners, bonus templates,
 * employees, system_settings, company banks) have no tenant column at all —
 * they are platform singletons. Granting one today shows that sub-admin the
 * PLATFORM's data, and in the case of Config lets them edit values that apply
 * to every tenant including the operator's own clients.
 *
 * Making those per-tenant is a schema change plus a scoping pass per section,
 * not a permission change. Until then the flag keeps the warning in front of
 * whoever ticks the box. Drop it in the same commit that adds the tenant
 * column, or the warning outlives the problem.
 */
export interface PermissionGroup {
  key: string;
  label: string;
  hint?: string;
  perms: string[];
  /** Destructive or money-moving — rendered apart from the routine ones. */
  sensitive?: boolean;
  /** False ⇒ guarded outside require_permission; shown but not grantable. */
  available?: boolean;
  /** Why it cannot be delegated. Required when `available` is false. */
  unavailableReason?: string;
  /** Grantable, but the page still shows the PLATFORM's data, not this
   *  tenant's — the table behind it has no tenant column yet. */
  platformWide?: boolean;
}

const NO_TENANT_COLUMN = 'Platform administration — not per-tenant yet';

/** Sidebar order, top to bottom. Sub-admins and White-label omitted on purpose. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    hint: 'Headline numbers for their own clients',
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
    hint: 'Approve or reject their clients’ documents',
    perms: ['kyc.view', 'kyc.manage'],
  },
  {
    key: 'trading',
    label: 'Trades',
    hint: 'Their clients’ positions, orders and history',
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
    hint: 'Review and approve their clients’ incoming funds',
    perms: ['deposits.view', 'deposits.approve', 'deposits.reject'],
  },
  {
    key: 'transactions',
    label: 'Transactions',
    // Shares deposits.view with the Deposits page, so the two rows tick
    // together. Listed separately because the sidebar lists it separately and
    // an operator looking for "Transactions" should find it.
    hint: 'Their clients’ money movements — granted with Deposits',
    perms: ['deposits.view'],
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    hint: 'Review and approve their clients’ payouts',
    perms: ['withdrawals.view', 'withdrawals.approve', 'withdrawals.reject'],
  },
  {
    key: 'banks',
    label: 'Banks',
    hint: '⚠ Platform deposit banks — not per-tenant yet',
    perms: ['banks.view', 'banks.create', 'banks.update'],
    platformWide: true,
  },
  {
    key: 'account_types',
    label: 'Account types',
    hint: '⚠ Platform account tiers — edits apply to every tenant',
    perms: ['config.view'],
    platformWide: true,
  },
  {
    key: 'config',
    label: 'Config',
    hint: '⚠ Charges, spreads, swaps — edits apply to every tenant',
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
    hint: '⚠ IB, MLM and copy programs run platform-wide',
    perms: ['ib.view', 'ib.manage'],
    platformWide: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    hint: '⚠ Platform totals — Dashboard has their own numbers',
    perms: ['analytics.view', 'exposure.view'],
    platformWide: true,
  },
  {
    key: 'ledger',
    label: 'Audit logs',
    hint: 'Activity trail for their own clients',
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
    key: 'bonus',
    label: 'Bonus',
    hint: '⚠ Platform bonus templates — not per-tenant yet',
    perms: ['bonus.view', 'bonus.create', 'bonus.update'],
    platformWide: true,
  },
  {
    key: 'banners',
    label: 'Banners',
    hint: '⚠ Platform banners — not per-tenant yet',
    perms: ['banners.view', 'banners.create', 'banners.update', 'banners.delete'],
    platformWide: true,
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
    unavailableReason: NO_TENANT_COLUMN,
  },
  {
    key: 'settings',
    label: 'Settings',
    perms: [],
    available: false,
    unavailableReason: NO_TENANT_COLUMN,
  },

  {
    key: 'funds',
    label: 'Adjust balances',
    hint: 'Add or deduct funds on their clients’ accounts',
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
  {
    key: 'impersonate',
    label: 'Log in as a client',
    hint: 'Open the trader app as one of their own clients',
    perms: ['users.impersonate'],
    sensitive: true,
  },
  {
    key: 'delete_users',
    label: 'Delete clients',
    // The endpoint is require_user_in_scope("users.delete"), so a tenant can
    // only ever reach their own pool — another broker's client answers 404, not
    // 403, so they cannot even confirm the id exists. Kept a separate grant from
    // users.view because it is irreversible: the service closes positions and
    // orders, then wipes trading accounts, copy allocations, deposits,
    // withdrawals, transactions, referrals and the IB profile before the row.
    hint: '⚠ Irreversible — wipes their accounts, deposits and full history',
    perms: ['users.delete'],
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
