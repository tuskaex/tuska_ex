/**
 * Human-readable permission groups for the sub-admin form.
 *
 * The backend speaks in dotted strings (`users.view`, `deposits.approve`).
 * Showing those raw made the operator guess which of `deposits.view`,
 * `deposits.approve` and `deposits.reject` they needed to tick to let a tenant
 * "handle deposits" — so a group is one decision that grants the whole set.
 *
 * ── ONE GROUP PER SIDEBAR SECTION A TENANT CAN ACTUALLY REACH ──────────────
 * The admin API fails closed for sub-admins: `require_permission(tenant_safe=)`
 * refuses them any route not explicitly marked as pool-scoped. Only these
 * sections carry that mark:
 *
 *     Dashboard · Users · Identity verification · Trades · Deposits
 *     Transactions · Audit logs · Support · White-label
 *
 * This list used to offer Bank accounts, Reports & analytics, IB / brokerage
 * and Banners & bonuses too. Those sections are platform-wide and hold every
 * tenant's data, so they are not tenant-safe and never will be — granting them
 * added strings to the row that bought nothing: the sidebar entry stayed hidden
 * and the API answered 403. A checkbox that cannot change what the grantee sees
 * is worse than no checkbox, because the operator believes they granted
 * something.
 *
 * If a section is made tenant-safe later, add its group back here in the same
 * commit — the two have to move together or this drifts again.
 *
 * White-label is deliberately absent: /branding authorises on brand ownership
 * (assert_brand_owner), not on a permission, so every tenant can always manage
 * their own brand and there is nothing to grant.
 */
export interface PermissionGroup {
  key: string;
  label: string;
  hint?: string;
  perms: string[];
  /** Destructive or money-moving — rendered apart from the routine ones. */
  sensitive?: boolean;
}

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
    key: 'ledger',
    label: 'Audit logs',
    hint: 'Read the activity trail for their own clients',
    perms: ['audit_logs.view'],
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

/** A group counts as on only when every string in it is granted — a half-granted
 *  group would show as enabled while silently failing on some action. */
export function groupChecked(group: PermissionGroup, granted: string[]): boolean {
  return group.perms.every((p) => granted.includes(p));
}

export function toggleGroup(group: PermissionGroup, granted: string[]): string[] {
  const on = groupChecked(group, granted);
  return on
    ? granted.filter((p) => !group.perms.includes(p))
    : Array.from(new Set([...granted, ...group.perms]));
}
