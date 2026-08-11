import { isExternalTerminalEnabled } from './terminalHandoff';

const STORAGE_KEY = 'pt_active_trading_account';

export function setPersistedTradingAccountId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) sessionStorage.setItem(STORAGE_KEY, id);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function getPersistedTradingAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

/**
 * Terminal URL; without an account id returns picker path `/trading`.
 *
 * When the terminal has been split onto its own domain this returns the local
 * `/terminal` staging route rather than a cross-domain URL. The redirect cannot
 * be built here: it needs a freshly minted handoff code, which is an async
 * network call, and every caller of this function is a `<Link href>`.
 *
 * The branch is on the build-time env var alone — deliberately not on the
 * current host. A host check runs only in the browser, so the server would
 * render one href and the client another, and React would flag the hydration
 * mismatch. `/terminal` resolves the host question itself at runtime.
 */
export function tradingTerminalUrl(accountId: string | null | undefined, extra?: Record<string, string>) {
  if (!accountId) return '/trading';
  const q = new URLSearchParams({ account: accountId, ...extra });
  if (isExternalTerminalEnabled()) return `/terminal?${q.toString()}`;
  return `/trading/terminal?${q.toString()}`;
}
