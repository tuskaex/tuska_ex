/**
 * Whose brand is this admin panel wearing?
 *
 * The same admin build serves TuskaEx's own back office and every white-label
 * tenant's. A tenant is sold this panel as *theirs* — the parent platform's
 * wordmark sitting in their sidebar is the product leaking its own vendor.
 *
 * Two steps, and the order matters:
 *
 *  1. `isTenantAdminHost()` — synchronous, no network, decided from the
 *     hostname alone. It is what lets a caller render a neutral gap instead of
 *     TuskaEx's logo for the moment before the lookup resolves.
 *  2. `fetchTenantBrand()` — asks who owns this domain.
 *
 * The endpoint is public: whoever is looking at a login screen has no session
 * yet and still has to see whose panel this is. It lives on the admin service,
 * and this app's own /admin-api proxy only reaches /api/v1/admin/*, so the
 * tenant vhost routes /api/v1/public/branding/ straight through — see
 * deploy/scripts/connect-tenant-domain.sh.
 */

export type TenantBrand = {
  /** On a tenant host, true until we know whose it is. */
  loading: boolean;
  isTenant: boolean;
  brandName: string;
  logoUrl: string | null;
};

/** TuskaEx's own admin hostname. Anything else is a tenant's. */
function platformAdminHost(): string {
  return (process.env.NEXT_PUBLIC_PLATFORM_ADMIN_HOST ?? '').trim().toLowerCase();
}

export function isTenantAdminHost(host?: string | null): boolean {
  const here = (host ?? (typeof window !== 'undefined' ? window.location.host : ''))
    .toLowerCase();
  if (!here) return false;
  const platform = platformAdminHost();
  // Unconfigured (local dev) → treat everything as TuskaEx, otherwise
  // localhost would render an unbranded panel.
  if (!platform) return false;
  return here !== platform;
}

type PublicBranding = { brand_name: string | null; logo_url: string | null };

/**
 * Returns null on any failure. Callers fall back to a neutral shell, never to
 * TuskaEx's: "could not load the brand" must not be shown as "this is TuskaEx".
 */
export async function fetchTenantBrand(): Promise<PublicBranding | null> {
  if (typeof window === 'undefined') return null;
  const host = window.location.host.split(':')[0] || window.location.host;
  try {
    const res = await fetch(
      `/api/v1/public/branding/by-domain?domain=${encodeURIComponent(host)}`,
      { credentials: 'omit' },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicBranding;
  } catch {
    return null;
  }
}
