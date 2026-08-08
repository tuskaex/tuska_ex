/**
 * Net P&L — THE user-facing figure across web and the mobile app.
 *
 * net = gross profit − commission + swap
 *
 * The server sends GROSS profit in `profit` (and `pnl` for closed trades);
 * `swap` is stored negative for charges, so it is ADDED here. Any UI that
 * shows a position's/trade's P&L must go through this helper — hand-rolling
 * the arithmetic is how the web and APK drift apart.
 */
export interface PnlParts {
  profit?: number | null;
  commission?: number | null;
  swap?: number | null;
}

export function netPnl(p: PnlParts): number {
  // Number(...) on each term: bit-identical for the numeric JSON the server
  // sends, and defends against a string field turning `+ swap` into
  // concatenation if a payload ever regresses.
  return Number(p.profit || 0) - Number(p.commission || 0) + Number(p.swap || 0);
}

/** Sum of net P&L over a set of positions/trades. */
export function sumNetPnl(list: PnlParts[]): number {
  return list.reduce((s, p) => s + netPnl(p), 0);
}

/**
 * Floating P&L for an OPEN position — gross, and deliberately so.
 *
 * Both charges are taken off the balance the moment they are incurred:
 * commission when the position opens (trading_service: `account.balance -=
 * commission`) and swap when the overnight engine runs (it debits the balance
 * and writes a `swap` transaction). The balance a trader is looking at has
 * already paid them.
 *
 * So subtracting them again from the floating figure charges them twice. It
 * showed: the terminal's own status bar read Balance 30,938.38 + Credit 100.00
 * + Floating −0.30, which is 31,038.08, against an Equity of 31,038.48 — off by
 * exactly the 0.39 of commission on the two open trades. The position rows were
 * doing it too, printing the charge in the CHARGES column and again inside a
 * P&L that had already deducted it.
 *
 * The server computes equity as balance + credit + GROSS, so this is what makes
 * the four numbers on that bar add up.
 *
 * Closed trades keep netPnl: there the question is what the whole trade did to
 * the account, and its costs belong in the answer.
 */
export function openPnl(p: PnlParts): number {
  return Number(p.profit || 0);
}

/** Sum of floating P&L over open positions. See openPnl. */
export function sumOpenPnl(list: PnlParts[]): number {
  return list.reduce((s, p) => s + openPnl(p), 0);
}
