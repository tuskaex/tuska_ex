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
 * The lookup is public by necessity: a visitor at the login screen has no
 * session yet and still has to see whose site they are on. It goes through
 * this app's own /brand/info route, which asks the admin service server-side.
 */

import { BRAND_LOGO, BRAND_NAME } from '@/config/brand';
import { isTenantHost } from '@/lib/tenantHost';

export { isTenantHost };

export type TenantBrand = {
  /** True while we know we are on a tenant domain but not yet whose. */
  loading: boolean;
  /** True on any host that is not TuskaEx's own. */
  isTenant: boolean;
  brandName: string;
  logoUrl: string | null;
  /** The tenant's theme colour, `#RRGGBB`; null/absent means platform blue. */
  brandColor?: string | null;
};


type PublicBranding = {
  brand_name: string | null;
  logo_url: string | null;
  brand_color?: string | null;
};

/**
 * Resolve the brand for the current hostname. Returns null on any failure —
 * callers fall back to a neutral shell rather than to TuskaEx's, because
 * "we could not load the brand" must never be shown as "this is TuskaEx".
 */
export async function fetchTenantBranding(): Promise<PublicBranding | null> {
  if (typeof window === 'undefined') return null;
  try {
    // Same-origin route that resolves the brand server-side from the Host
    // (src/app/brand/info). It does not depend on nginx routing
    // /api/v1/public/* to the admin service, and its logo_url is same-origin.
    const res = await fetch('/brand/info', { credentials: 'omit' });
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
