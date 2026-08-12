/**
 * Cross-domain session handoff: CRM (tuskaex.com) → terminal (speedtrade.tech).
 *
 * The two sites are separate registrable domains, so the CRM's `pt_access`
 * cookie — scoped to `.tuskaex.com` — is never sent to speedtrade.tech. A plain
 * redirect would land the user on a logged-out terminal.
 *
 * The bridge is a single-use code:
 *
 *   1. CRM  → POST /auth/handoff          → { code }        (JWT-authed)
 *   2. CRM  → location = <terminal>/trading/terminal?handoff=<code>&account=…
 *   3. Term → POST /auth/handoff/redeem   → Set-Cookie on .speedtrade.tech
 *   4. Term → strips ?handoff= from the URL
 *
 * Only the code rides the URL. It dies on first use or after ~60s, whichever
 * comes first, so the copy left behind in browser history is inert. Step 4
 * matters for the same reason the backend keeps the TTL short: a URL the user
 * can re-share should never carry a live credential.
 *
 * Everything here no-ops when NEXT_PUBLIC_TERMINAL_ORIGIN is unset, which is
 * how local dev and any single-domain deploy keep the old in-app terminal.
 */

import api from './api/client';

/** Public origin of the external terminal, e.g. `https://trade.speedtrade.tech`.
 *  Read via the literal `process.env.X` form — Next inlines it by exact text
 *  match at build time, so a computed lookup would compile to `undefined`. */
const RAW_TERMINAL_ORIGIN = process.env.NEXT_PUBLIC_TERMINAL_ORIGIN ?? '';

export const TERMINAL_ORIGIN = RAW_TERMINAL_ORIGIN.trim().replace(/\/$/, '');

/** True when the terminal has been split onto its own domain. */
export function isExternalTerminalEnabled(): boolean {
  return TERMINAL_ORIGIN.length > 0;
}

/** True when this browser is already ON the terminal domain — the same Next
 *  app serves both, so "should I hand off or just render?" is a host question,
 *  not a build question. */
export function isOnTerminalHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isExternalTerminalEnabled()) return false;
  try {
    return window.location.host === new URL(TERMINAL_ORIGIN).host;
  } catch {
    return false;
  }
}

/**
 * Hosts whose "Trade" belongs on speedtrade.tech: TuskaEx's own CRM, and
 * nothing else.
 *
 * This list is the whole point. One trader build serves TuskaEx AND every
 * white-label tenant's custom domain, so a switch that only asked "is the
 * terminal split on?" sent a tenant's traders to speedtrade.tech — off the
 * broker's own domain and onto someone else's brand, mid-trade. A white-label
 * domain has to keep its users on itself; its terminal renders in place.
 */
function isTuskaExCrmHost(): boolean {
  if (typeof window === 'undefined') return false;
  const here = window.location.host.toLowerCase();
  return [process.env.NEXT_PUBLIC_MARKETING_HOST, process.env.NEXT_PUBLIC_TRADE_HOST]
    .filter(Boolean)
    .some((h) => String(h).toLowerCase() === here);
}

/** Hand off to the terminal domain, or render in place. */
export function shouldHandOffToTerminal(): boolean {
  return isExternalTerminalEnabled() && isTuskaExCrmHost() && !isOnTerminalHost();
}

export const HANDOFF_QUERY_PARAM = 'handoff';

type HandoffResponse = { code: string; expires_in: number; terminal_url: string };

/** Mint a single-use code for the current session. Throws on failure so the
 *  caller can show a real error rather than bouncing to a logged-out terminal. */
export async function createHandoffCode(): Promise<string> {
  const res = await api.post<HandoffResponse>('/auth/handoff');
  const code = res?.code;
  if (!code) throw new Error('Handoff code missing from response');
  return code;
}

/**
 * Absolute terminal URL carrying the handoff code plus whatever the terminal
 * needs to open the right screen.
 */
export function buildTerminalUrl(code: string, params: Record<string, string>): string {
  const q = new URLSearchParams({ ...params, [HANDOFF_QUERY_PARAM]: code });
  return `${TERMINAL_ORIGIN}/trading/terminal?${q.toString()}`;
}

/** The handoff code in the current URL, if any. */
export function readHandoffCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get(HANDOFF_QUERY_PARAM);
  return code && code.trim() ? code.trim() : null;
}

/** Drop `?handoff=` from the address bar without a navigation or history entry.
 *  replaceState, not push: the pre-strip URL must not be reachable via Back. */
export function stripHandoffFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(HANDOFF_QUERY_PARAM)) return;
  url.searchParams.delete(HANDOFF_QUERY_PARAM);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * If this page load carries a handoff code, trade it for cookies on THIS
 * domain. Returns true when a session was established.
 *
 * The code is stripped from the URL whether or not redemption succeeded — a
 * spent or expired code is useless, and leaving it in place means a refresh
 * retries it forever and shows the same error every time.
 */
export async function redeemHandoffFromUrl(): Promise<boolean> {
  const code = readHandoffCodeFromUrl();
  if (!code) return false;
  stripHandoffFromUrl();
  try {
    await api.post('/auth/handoff/redeem', { code });
    return true;
  } catch {
    // Swallowed on purpose: the caller falls through to its normal auth check,
    // which routes an unauthenticated user to /auth/login. Surfacing a raw
    // "code expired" toast here would just duplicate that.
    return false;
  }
}
