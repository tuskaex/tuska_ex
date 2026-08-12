import { NextResponse, type NextRequest } from 'next/server';
import { isMarketingPath } from '@/config/marketingPaths';

/**
 * ── Terminal on its own domain (NEXT_PUBLIC_TERMINAL_ORIGIN) ──────
 * The trading terminal has moved to speedtrade.tech; tuskaex.com keeps the
 * CRM (dashboard, wallet, KYC, deposits, IB, support). Those are different
 * registrable domains, so the `.tuskaex.com` session cookie cannot follow the
 * user — see `src/lib/terminalHandoff.ts` for the single-use-code bridge that
 * carries the session across. This middleware's part is small: keep
 * /trading/terminal from rendering anywhere except the terminal host, and send
 * strays to /terminal, which does the minting.
 *
 * Everything below is the older tuskaex.com-only split. It still runs when
 * NEXT_PUBLIC_TERMINAL_ORIGIN is unset (local dev, or a rollback), and is
 * bypassed for terminal paths when it is set.
 *
 * Domain split (asymmetric, by design):
 *   - tuskaex.com (apex): marketing + auth + every user-app page.
 *     If the user lands on the apex with /trading/terminal, we bounce
 *     them to the trade subdomain so the terminal has a clean origin.
 *   - trade.tuskaex.com: hosts the trading terminal canonically, but
 *     ALSO serves every other page. Previously we redirected non-
 *     terminal traffic back to the apex, but that caused two persistent
 *     production issues: (1) RSC prefetches and TradingView chart
 *     bundles cross-origin to the apex, getting CORS-blocked; (2) some
 *     browsers cached 308 redirects from older middleware builds and
 *     replayed them locally for weeks even after we shipped fixes.
 *     Letting both hosts serve all pages eliminates both problems and
 *     adds no real cost — they're authenticated app pages, not
 *     marketing pages with SEO concerns.
 *
 * The auth cookie is Domain=.tuskaex.com so a single session works on
 * apex AND subdomain. If NEXT_PUBLIC_MARKETING_HOST or
 * NEXT_PUBLIC_TRADE_HOST is unset (local dev), this middleware no-ops.
 *
 * ── Auth-endpoint rate limiting (P1 M4) ─────────────────────────
 * In-memory token bucket layered in front of the gateway as defense
 * in depth. Single-instance deploy assumption — each Next.js process
 * keeps its own counter, so for multi-instance deploys the effective
 * limit is N × this value. For strict cluster-wide limits, swap the
 * `rateLimitStore` Map for a Redis-backed implementation (Upstash,
 * `@upstash/ratelimit`) without changing the surrounding logic.
 *
 * Why in middleware and not the proxy route: middleware runs BEFORE
 * the body is parsed — a flood attack costs us almost nothing, vs
 * the proxy route which would already have ingested the JSON body.
 */

const TRADE_PREFIXES = ['/trading/terminal'];
const NEUTRAL_PREFIXES = ['/api/', '/_next/', '/s/', '/static/', '/images/'];
const NEUTRAL_EXACT = new Set<string>(['/favicon.ico', '/robots.txt', '/sitemap.xml']);

/* ── Rate-limit configuration ──────────────────────────────────
 * Paths NOT listed here are NOT rate-limited at this layer (the
 * gateway/CDN may still throttle them). Keep the set tight — every
 * map insertion costs memory per IP. */
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/v1/auth/login':           { limit: 5, windowMs: 60_000 },
  '/api/v1/auth/register':        { limit: 3, windowMs: 60_000 },
  '/api/v1/auth/reset-password':  { limit: 3, windowMs: 60_000 },
  '/api/v1/auth/email/start-verification': { limit: 5, windowMs: 60_000 },
  '/api/v1/auth/email/verify-otp':         { limit: 10, windowMs: 60_000 },
  '/api/v1/auth/google':          { limit: 10, windowMs: 60_000 },
};

/* Per-process bucket: key = `${ip}:${path}`, value = recent ts list.
 * Trimmed lazily on each access. Cap on map size prevents
 * unbounded growth from spammy IPs. */
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_MAX_KEYS = 10_000;

function getClientIp(req: NextRequest): string {
  /* Cloudflare → cf-connecting-ip > x-forwarded-for[0] > x-real-ip.
   * Falls back to 'unknown' which buckets all anonymous traffic
   * together — intentionally aggressive for safety. */
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0];
    if (first) return first.trim();
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function checkRateLimit(
  path: string,
  ip: string,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const config = RATE_LIMITS[path];
  if (!config) return { allowed: true };
  const key = `${ip}:${path}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const prev = rateLimitStore.get(key) ?? [];
  /* Drop expired timestamps so the bucket only counts current-window hits. */
  const timestamps = prev.filter((t) => t > windowStart);
  if (timestamps.length >= config.limit) {
    /* timestamps[0] is the oldest in-window hit. Retry-After is the
     * time until that hit falls out of the window. */
    const oldest = timestamps[0]!;
    const retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(retryAfter, 1) };
  }
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  /* LRU-style eviction: when the map exceeds the cap, drop the
   * oldest-inserted key. Map preserves insertion order in JS, so
   * `keys().next().value` is the oldest. */
  if (rateLimitStore.size > RATE_LIMIT_MAX_KEYS) {
    const firstKey = rateLimitStore.keys().next().value;
    if (firstKey !== undefined) rateLimitStore.delete(firstKey);
  }
  return { allowed: true };
}

function isTradePath(path: string): boolean {
  return TRADE_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
}

function isNeutral(path: string): boolean {
  if (NEUTRAL_EXACT.has(path)) return true;
  return NEUTRAL_PREFIXES.some((p) => path.startsWith(p));
}

/** True only for a real address-bar navigation.
 *
 * RSC prefetches and sub-resource fetches must never be redirected across
 * origins: the browser CORS-blocks the result and the page half-loads. Next
 * marks them with these headers / the `_rsc` query param. */
function isTopLevelNavigation(req: NextRequest): boolean {
  if (req.headers.get('rsc')) return false;
  if (req.headers.get('next-router-prefetch')) return false;
  if (req.headers.get('next-router-state-tree')) return false;
  if (req.nextUrl.searchParams.has('_rsc')) return false;
  const mode = req.headers.get('sec-fetch-mode');
  if (mode && mode !== 'navigate') return false;
  return true;
}

/** Hostname of the external terminal, or '' when the terminal is still in-app. */
function terminalHost(): string {
  const raw = (process.env.NEXT_PUBLIC_TERMINAL_ORIGIN ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function middleware(req: NextRequest) {
  /* Rate-limit auth endpoints FIRST — before the host-routing logic
   * below. This applies whether the host split is configured or not
   * (local dev gets protection too). */
  const path = req.nextUrl.pathname;
  if (RATE_LIMITS[path]) {
    const ip = getClientIp(req);
    const check = checkRateLimit(path, ip);
    if (!check.allowed) {
      return new NextResponse(
        JSON.stringify({ detail: 'Too many requests. Please wait before retrying.' }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': String(check.retryAfterSec),
            /* Match the proxy's standard cache directive so 429s aren't
             * cached by an intermediate proxy and replayed at the user. */
            'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
        },
      );
    }
  }

  const host = req.headers.get('host')?.toLowerCase().split(':')[0] ?? '';
  const { pathname, search } = req.nextUrl;

  // Helper: build a non-cacheable redirect. We use 307 (temporary) so a
  // browser can never cache the redirect across deploys; we also set
  // Cache-Control: no-store on the redirect response itself so the cache
  // never holds onto it. Without this, a stale 308 redirect from an older
  // middleware build will persist on every previously-visited browser
  // even after we deploy a fix — the request never even leaves the browser.
  const noCacheRedirect = (url: string) => {
    const r = NextResponse.redirect(url, 307);
    r.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return r;
  };

  /* ── Terminal split onto its own domain ────────────────────────────
   * When NEXT_PUBLIC_TERMINAL_ORIGIN is set, /trading/terminal only renders
   * on the terminal host. Anywhere else — a bookmark, an old email link,
   * someone typing the URL — is sent to /terminal, the staging route that
   * mints a handoff code and then redirects.
   *
   * Why not redirect straight to the terminal domain from here: the code has
   * to come from an authenticated API call, and middleware cannot make one.
   * Sending the user across without a code lands them on a logged-out
   * terminal with no way to sign in, which is precisely the failure this
   * whole flow exists to avoid.
   *
   * Runs before the marketing/trade host gate so it also covers hosts that
   * gate does not know about. */
  // Only TuskaEx's own hosts bounce. A white-label tenant's custom domain
  // serves its terminal in place — sending its traders to speedtrade.tech would
  // take them off the broker's domain onto someone else's brand.
  const crmHosts = [process.env.NEXT_PUBLIC_MARKETING_HOST, process.env.NEXT_PUBLIC_TRADE_HOST]
    .filter(Boolean)
    .map((h) => String(h).toLowerCase());
  const termHost = terminalHost();

  /* ── White-label tenant domains: login, never marketing ────────────
   * Any host this app serves that is NOT one of TuskaEx's own is a tenant's
   * domain. One build serves them all, so without this a visitor typing a
   * broker's domain lands on TuskaEx's marketing site — someone else's brand,
   * someone else's pricing, on the domain they paid to make theirs.
   *
   * They go to the login screen instead, which is what "Apex mode" already
   * promises in the admin panel: "Visitors landing on the root go straight to
   * login."
   *
   * Only marketing is redirected. /auth, /s/ share links, the API, static
   * assets and every authenticated app route are untouched — a tenant's users
   * need all of those. */
  const platformHosts = [...crmHosts, termHost].filter(Boolean);
  const onTenantDomain = platformHosts.length > 0 && !platformHosts.includes(host);
  if (onTenantDomain && !isNeutral(pathname) && isMarketingPath(pathname)) {
    if (!isTopLevelNavigation(req)) return NextResponse.next();
    return noCacheRedirect(new URL('/auth/login', req.url).toString());
  }
  if (
    termHost && host !== termHost && crmHosts.includes(host)
    && !isNeutral(pathname) && isTradePath(pathname)
  ) {
    if (!isTopLevelNavigation(req)) return NextResponse.next();
    return noCacheRedirect(new URL(`/terminal${search}`, req.url).toString());
  }

  const marketingHost = process.env.NEXT_PUBLIC_MARKETING_HOST;
  const tradeHost = process.env.NEXT_PUBLIC_TRADE_HOST;
  if (!marketingHost || !tradeHost) return NextResponse.next();

  const onMarketing = host === marketingHost.toLowerCase();
  const onTrade = host === tradeHost.toLowerCase();
  if (!onMarketing && !onTrade) return NextResponse.next();

  if (isNeutral(pathname)) return NextResponse.next();

  const trade = isTradePath(pathname);

  // Terminal route on apex → bounce to trade subdomain. Only top-level
  // navigations are redirected — RSC prefetches / sub-resource fetches
  // must stay same-origin so CORS doesn't break them.
  //
  // Unreachable once the terminal has its own domain: the block above has
  // already claimed every /trading/terminal request on a non-terminal host.
  // Kept intact so unsetting NEXT_PUBLIC_TERMINAL_ORIGIN restores the old
  // apex → trade.tuskaex.com behaviour with no other change.
  if (onMarketing && trade) {
    if (!isTopLevelNavigation(req)) return NextResponse.next();
    return noCacheRedirect(`https://${tradeHost}${pathname}${search}`);
  }
  // Trade subdomain → serve every page. We deliberately do NOT redirect
  // back to apex anymore (see the file-level comment for context).
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|charting_library/|datafeeds/).*)'],
};
