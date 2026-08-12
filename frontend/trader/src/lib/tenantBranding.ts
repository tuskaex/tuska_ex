'use client';

/**
 * Whose brand is this page wearing?
 *
 * tuskaex.com is the parent platform. A sub-admin created there can connect
 * their own domain, and on THAT domain the app is theirs: their logo, their
 * name, no mention of TuskaEx anywhere a visitor can see. One build serves all
 * of them, so the answer is a runtime property of the hostname.
 *
 * Two steps, in this order, and the order is the point:
 *
 *  1. `isTenantHost()` — synchronous, no network. Just "is this one of
 *     TuskaEx's own hostnames?". It is what stops the platform's logo being
 *     painted for the split second before a fetch resolves; on a tenant domain
 *     that flash would show a competitor's brand to the broker's own client.
 *  2. `fetchTenantBranding()` — asks the backend who owns this domain.
 *
 * The endpoint is public by necessity: a visitor at the login screen has no
 * session yet and still has to see whose site they are on. It lives on the
 * admin service, which the trader app does not proxy, so the tenant vhost
 * routes /api/v1/public/branding/ straight there — see
 * deploy/scripts/connect-tenant-domain.sh.
 */

import { BRAND_LOGO, BRAND_NAME } from '@/config/brand';

export type TenantBrand = {
  /** True while we know we are on a tenant domain but not yet whose. */
  loading: boolean;
  /** True on any host that is not TuskaEx's own. */
  isTenant: boolean;
  brandName: string;
  logoUrl: string | null;
};

/** TuskaEx's own hostnames. Everything else is somebody's white label. */
function platformHosts(): string[] {
  return [
    process.env.NEXT_PUBLIC_MARKETING_HOST,
    process.env.NEXT_PUBLIC_TRADE_HOST,
    (() => {
      const t = (process.env.NEXT_PUBLIC_TERMINAL_ORIGIN ?? '').trim();
      if (!t) return '';
      try { return new URL(t).host; } catch { return ''; }
    })(),
  ]
    .filter(Boolean)
    .map((h) => String(h).toLowerCase());
}

export function isTenantHost(): boolean {
  if (typeof window === 'undefined') return false;
  const hosts = platformHosts();
  // No hosts configured at all (local dev) → treat everything as TuskaEx,
  // otherwise `npm run dev` on localhost would render an unbranded shell.
  if (hosts.length === 0) return false;
  return !hosts.includes(window.location.host.toLowerCase());
}

type PublicBranding = {
  brand_name: string | null;
  logo_url: string | null;
};

/**
 * Resolve the brand for the current hostname. Returns null on any failure —
 * callers fall back to a neutral shell rather than to TuskaEx's, because
 * "we could not load the brand" must never be shown as "this is TuskaEx".
 */
export async function fetchTenantBranding(): Promise<PublicBranding | null> {
  if (typeof window === 'undefined') return null;
  // split() can type as undefined under noUncheckedIndexedAccess; the host is
  // never empty in a browser, but the fallback keeps the call well-typed.
  const host = window.location.host.split(':')[0] ?? window.location.host;
  try {
    const res = await fetch(
      `/api/v1/public/branding/by-domain?domain=${encodeURIComponent(host)}`,
      { credentials: 'omit' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PublicBranding;
    return data ?? null;
  } catch {
    return null;
  }
}

/** The TuskaEx defaults, for hosts that ARE TuskaEx. */
export const PLATFORM_BRAND: TenantBrand = {
  loading: false,
  isTenant: false,
  brandName: BRAND_NAME,
  logoUrl: BRAND_LOGO,
};
