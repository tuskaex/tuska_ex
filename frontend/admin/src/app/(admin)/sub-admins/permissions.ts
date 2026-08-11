/**
 * Human-readable permission groups for the sub-admin form.
 *
 * The backend speaks in dotted strings (`users.view`, `deposits.approve`).
 * Showing those raw made the operator guess which of `deposits.view`,
 * `deposits.approve` and `deposits.reject` they needed to tick to let a tenant
 * "handle deposits" — so a group is one decision that grants the whole set.
 *
 * Every string here exists in the backend's PERMISSION_CATALOG. Groups are named
 * after what this platform can actually do, not after another product's menu:
 * inventing a "Netting overrides" checkbox that grants nothing would be worse
 * than leaving it out.
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
  { key: 'users', label: 'Users', hint: 'See and open client accounts in their pool', perms: ['users.view'] },
  { key: 'kyc', label: 'KYC review', hint: 'Approve or reject identity documents', perms: ['kyc.view', 'kyc.manage'] },
  { key: 'deposits', label: 'Deposits', hint: 'Review and approve incoming funds', perms: ['deposits.view', 'deposits.approve', 'deposits.reject'] },
  { key: 'withdrawals', label: 'Withdrawals', hint: 'Review and approve payouts', perms: ['withdrawals.view', 'withdrawals.approve', 'withdrawals.reject'] },
  { key: 'banks', label: 'Bank accounts', perms: ['banks.view', 'banks.create', 'banks.update'] },
  { key: 'trading', label: 'Trading view', hint: 'Read positions, orders and trades', perms: ['trades.view', 'positions.view', 'orders.view'] },
  { key: 'reports', label: 'Reports & analytics', perms: ['analytics.view', 'exposure.view'] },
  { key: 'ledger', label: 'Audit log', perms: ['audit_logs.view'] },
  { key: 'brokerage', label: 'IB / brokerage', perms: ['ib.view', 'ib.manage'] },
  { key: 'support', label: 'Support tickets', perms: ['tickets.view', 'tickets.reply', 'tickets.assign'] },
  { key: 'marketing', label: 'Banners & bonuses', perms: ['banners.view', 'banners.create', 'banners.update', 'bonus.view', 'bonus.create'] },

  { key: 'funds', label: 'Adjust balances', hint: 'Add or deduct funds on a client account', perms: ['users.add_fund', 'users.deduct_fund'], sensitive: true },
  { key: 'risk', label: 'Risk controls', hint: 'Ban, block trading, kill switch', perms: ['users.ban', 'users.block_trading', 'users.kill_switch'], sensitive: true },
  { key: 'place_orders', label: 'Place orders for clients', perms: ['trades.create'], sensitive: true },
  { key: 'edit_trades', label: 'Edit trades', hint: 'Correct a position', perms: ['trades.modify'], sensitive: true },
  { key: 'close_trades', label: 'Close trades', perms: ['trades.close'], sensitive: true },
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
