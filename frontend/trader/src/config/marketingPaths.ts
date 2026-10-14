/**
 * The marketing site's URLs, in one place.
 *
 * Two very different things need this list and must not drift apart:
 *
 *  - AuthProvider, to know a page renders without a session.
 *  - middleware, to know a page is TuskaEx's own marketing — which a
 *    white-label tenant's domain must never serve. A tenant pays for their own
 *    brand; a visitor typing their domain and landing on TuskaEx's "About us"
 *    is the single worst thing this app could show them.
 *
 * `/auth/*` and `/s/*` are deliberately NOT here. They are public, but they are
 * not marketing: /auth is where a tenant visitor is being sent, and /s/ is a
 * public share link that has to keep working on every host.
 */
export const MARKETING_EXACT_PATHS = new Set<string>([
  '/',
  // Top-level marketing pages (light + dark legacy)
  '/about', '/contact', '/how-it-works', '/platforms', '/white-label',
  '/privacy', '/terms', '/risk',
  // New Swistrade-port marketing pages
  '/careers', '/collaboration', '/group', '/institutional',
  '/introducing-brokers', '/money-managers', '/partners',
  // home/page marketing rebuild pages
  '/policy', '/markets', '/cfds', '/currency-pairs',
  '/precious-metals', '/demo-account',
  // Legacy marketing routes still in the (landing) group
  '/trading/overview', '/protocol',
  '/trading/forex', '/trading/commodities', '/trading/indices', '/trading/crypto',
  '/platforms/web', '/platforms/copy-trading', '/platforms/prop-trading',
  '/platforms/ib-management', '/platforms/super-admin',
  '/accounts/standard', '/accounts/pro', '/accounts/demo',
]);

const MARKETING_PREFIXES = ['/company', '/education'];

/** TuskaEx's own marketing surface. */
export function isMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (MARKETING_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return MARKETING_EXACT_PATHS.has(pathname);
}

/**
 * TuskaEx-only pages that are NOT public marketing. On TuskaEx's hosts they
 * keep their current auth behaviour (so they stay off MARKETING_EXACT_PATHS,
 * which AuthProvider treats as public); a white-label domain must never serve
 * them, so middleware sends tenant visitors to login like any marketing page.
 *
 * /account-deletion names TuskaEx and its support address throughout.
 * /education* is already covered by the '/education' marketing prefix.
 */
const TENANT_BLOCKED_EXACT_PATHS = new Set<string>(['/account-deletion']);

/** A path a white-label tenant's domain must never serve. */
export function isTenantBlockedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return isMarketingPath(pathname) || TENANT_BLOCKED_EXACT_PATHS.has(pathname);
}
