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
  /** Ticked when the create form opens. See DEFAULT_NEW_TENANT_PERMISSIONS. */
  defaultForNewTenant?: boolean;
}

const NO_TENANT_COLUMN = 'Platform administration — not per-tenant yet';

/** Sidebar order, top to bottom. Sub-admins and White-label omitted on purpose. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'dashboard',
    defaultForNewTenant: true,
    label: 'Dashboard',
    hint: 'Headline numbers for their own clients',
    perms: ['analytics.view'],
  },
  {
    key: 'users',
    defaultForNewTenant: true,
    label: 'Users',
    hint: 'See and open client accounts in their pool',
    perms: ['users.view'],
  },
  {
    key: 'kyc',
    defaultForNewTenant: true,
    label: 'Identity verification',
    hint: 'Approve or reject their clients’ documents',
    perms: ['kyc.view', 'kyc.manage'],
  },
  {
    key: 'trading',
    defaultForNewTenant: true,
    label: 'Trades',
    hint: 'Their clients’ positions, orders and history',
    perms: ['trades.view', 'positions.view', 'orders.view'],
  },
  {
    key: 'book',
    label: 'Book Management',
    // `platformWide` dropped: book_service now applies the same scope_filter
    // as the Users page, so A/B book stats, the user list and the A-book trade
    // views all show the caller's own pool. Shares trades.view with the Trades
    // row above, so the two tick together.
    hint: 'A/B book for their own clients — granted with Trades',
    perms: ['trades.view'],
  },
  {
    key: 'deposits',
    defaultForNewTenant: true,
    label: 'Deposits',
    hint: 'Review and approve their clients’ incoming funds',
    perms: ['deposits.view', 'deposits.approve', 'deposits.reject'],
  },
  {
    key: 'transactions',
    defaultForNewTenant: true,
    label: 'Transactions',
    // Shares deposits.view with the Deposits page, so the two rows tick
    // together. Listed separately because the sidebar lists it separately and
    // an operator looking for "Transactions" should find it.
    hint: 'Their clients’ money movements — granted with Deposits',
    perms: ['deposits.view'],
  },
  {
    key: 'withdrawals',
    defaultForNewTenant: true,
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
    defaultForNewTenant: true,
    label: 'Audit logs',
    hint: 'Activity trail for their own clients',
    perms: ['audit_logs.view'],
  },
  {
    key: 'admin_audit',
    label: 'Admin audit logs',
    // Was ['audit_logs.view'] — the same string as the Audit logs row above,
    // which is scoped to the tenant's own clients. Ticking one ticked both, so
    // a tenant granted their own activity trail also got every admin's actions
    // across every tenant. The route now refuses a sub_admin outright.
    perms: [],
    available: false,
    unavailableReason:
      'Platform administration — spans every admin, on every tenant',
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
    defaultForNewTenant: true,
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
    defaultForNewTenant: true,
    label: 'Adjust balances',
    hint: 'Add or deduct funds on their clients’ accounts',
    perms: ['users.add_fund', 'users.deduct_fund'],
    sensitive: true,
  },
  {
    key: 'risk',
    defaultForNewTenant: true,
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

/**
 * What a new tenant starts with, before the operator changes anything.
 *
 * The create form used to open with NOTHING ticked, which sounds safe and was
 * not. A white-label sub-admin exists to run their own brokerage; born with no
 * permissions they cannot see a client, approve a deposit or credit an account,
 * so every tenant needed roughly twenty boxes found and ticked by hand. Miss
 * one and the failure surfaces days later as a button that opens a dialog and
 * then answers "Permission 'users.add_fund' required" — which is exactly how
 * one tenant spent a week unable to fund their own clients.
 *
 * So the default is "a broker who can run their own book", and the operator
 * unticks rather than hunts. Fail-closed still holds where it earns its keep:
 *
 *   - Every `platformWide` row is OFF. Those pages show EVERY tenant's data,
 *     and Config edits apply to every tenant including the platform's own
 *     clients. That can only ever be a deliberate decision.
 *   - `delete_users` is OFF. It is irreversible — the service wipes accounts,
 *     deposits, withdrawals and history before the row.
 *   - `place_orders`, `edit_trades`, `close_trades` are OFF. Dealing-desk
 *     intervention in a client's positions is a separate kind of trust from
 *     administering their account.
 *   - `impersonate` is OFF. Signing in as a client is its own decision.
 *
 * `funds` and `risk` ARE on, and that is the deliberate part. Adjusting a
 * balance and banning an account are what running a brokerage consists of, and
 * `require_user_in_scope` already confines both to the tenant's own pool — a
 * foreign client answers 404. Withholding them by default does not make the
 * platform safer, it makes the tenant broken.
 */
export const DEFAULT_NEW_TENANT_PERMISSIONS: string[] = Array.from(
  new Set(
    PERMISSION_GROUPS.filter(
      (g) => g.defaultForNewTenant && g.available !== false && !g.platformWide,
    ).flatMap((g) => g.perms),
  ),
).sort();

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
