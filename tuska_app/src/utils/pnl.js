/**
 * P&L arithmetic. Mirrors `frontend/trader/src/lib/pnl.ts` exactly — the web
 * app and this app must print the same number for the same position, and the
 * only reliable way to guarantee that is for both to have one helper each and
 * for neither to hand-roll the arithmetic at a call site.
 *
 * The server sends GROSS profit in `profit` (and `pnl` for closed trades).
 * `swap` is stored NEGATIVE for a charge, which is why it is added rather
 * than subtracted wherever it appears below.
 */

function n(v) {
  return Number(v || 0);
}

/**
 * Floating P&L for an OPEN position — gross, and deliberately so.
 *
 * Both charges are already off the balance by the time a trader looks at it:
 * commission when the position opened (`trading_service`: `account.balance -=
 * commission`) and swap when the overnight engine ran. Subtracting them from
 * the floating figure charges them a second time.
 *
 * The symptom is that the account stops adding up. The server computes
 * equity as `balance + credit + GROSS unrealized`, so a floating figure with
 * the costs taken out again leaves Balance + Credit + Floating short of
 * Equity by exactly the commission on the open trades — and the position row
 * shows the charge in its own column *and* buried inside a P&L that had
 * already deducted it.
 */
export function openPnl(p) {
  if (!p) return null;
  const gross = p.profit ?? p.profit_loss ?? p.pl ?? p.pnl ?? null;
  return gross == null ? null : n(gross);
}

/** Sum of floating P&L over open positions. See openPnl. */
export function sumOpenPnl(list) {
  return (list || []).reduce((s, p) => s + (openPnl(p) ?? 0), 0);
}

/**
 * Net P&L for a CLOSED trade: gross − commission + swap.
 *
 * Closed trades keep the costs, because there the question is what the whole
 * trade did to the account, and its costs belong in the answer.
 */
export function netPnl(p) {
  if (!p) return null;
  const gross = p.pnl ?? p.profit ?? p.realized_pnl ?? p.profit_loss ?? null;
  if (gross == null) return null;
  return n(gross) - n(p.commission) + n(p.swap);
}

/** Sum of net P&L over closed trades. See netPnl. */
export function sumNetPnl(list) {
  return (list || []).reduce((s, t) => s + (netPnl(t) ?? 0), 0);
}
