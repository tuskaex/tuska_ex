'use client';

import { useEffect, useState } from 'react';
import {
  PLATFORM_BRAND,
  fetchTenantBranding,
  isTenantHost,
  type TenantBrand,
} from '@/lib/tenantBranding';

/**
 * The brand this hostname belongs to.
 *
 * On TuskaEx's own hosts this returns the platform defaults immediately and
 * never touches the network. On a white-label domain it starts in `loading`
 * with no brand at all, then fills in once the backend says who owns the
 * domain.
 *
 * `loading` exists so callers can render a neutral gap rather than TuskaEx's
 * logo. That distinction is the whole feature: a broker's client seeing the
 * parent platform's mark flash on their broker's own login page is worse than
 * seeing nothing there at all.
 *
 * A tenant with no logo uploaded yet resolves to a brand NAME with a null
 * logo — the caller shows the name as text. It still must not fall back to
 * TuskaEx's image.
 */
export function useTenantBrand(): TenantBrand {
  const [brand, setBrand] = useState<TenantBrand>(() =>
    // Decided synchronously from the hostname, so the first paint is already
    // correct on the platform and already blank (not wrong) on a tenant.
    typeof window !== 'undefined' && isTenantHost()
      ? { loading: true, isTenant: true, brandName: '', logoUrl: null }
      : PLATFORM_BRAND,
  );

  useEffect(() => {
    if (!isTenantHost()) return;
    let cancelled = false;
    void (async () => {
      const data = await fetchTenantBranding();
      if (cancelled) return;
      setBrand({
        loading: false,
        isTenant: true,
        brandName: data?.brand_name?.trim() || '',
        logoUrl: data?.logo_url || null,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return brand;
}
