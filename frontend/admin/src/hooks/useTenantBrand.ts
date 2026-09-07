'use client';

import { useEffect, useState } from 'react';
import {
  fetchPlatformBrand,
  fetchTenantBrand,
  isTenantAdminHost,
  tenantHostLabel,
  type TenantBrand,
} from '@/lib/tenantBrand';

const PLATFORM: TenantBrand = {
  loading: false,
  isTenant: false,
  brandName: 'TuskaEx',
  logoUrl: null, // null ⇒ caller uses its own bundled TuskaEx assets
};

/**
 * The brand this admin panel belongs to.
 *
 * On a tenant's host it starts in `loading` with no brand, then fills in.
 *
 * `loading` is the point: it lets callers render nothing rather than the
 * parent platform's logo. A tenant seeing TuskaEx's wordmark flash inside the
 * panel they were sold as their own is worse than seeing an empty space.
 *
 * On TuskaEx's own host it returns the platform defaults IMMEDIATELY —
 * `loading: false`, so the bundled wordmark paints with no gap — and then asks
 * whether an operator has uploaded a platform logo. That order matters: the
 * fallback here is TuskaEx's own mark, so there is nothing to hide while the
 * lookup runs, and a failed lookup changes nothing.
 */
export function useTenantBrand(serverHost?: string | null): TenantBrand {
  const [brand, setBrand] = useState<TenantBrand>(() =>
    isTenantAdminHost(serverHost)
      ? { loading: true, isTenant: true, brandName: '', logoUrl: null }
      : PLATFORM,
  );

  useEffect(() => {
    if (!isTenantAdminHost(serverHost)) {
      // Platform host: only an uploaded logo changes anything. The name stays
      // 'TuskaEx' — the sidebar's bundled wordmark already says it, and a
      // half-set brand should not rename the panel.
      let dropped = false;
      void (async () => {
        const data = await fetchPlatformBrand();
        if (dropped || !data?.logo_url) return;
        setBrand((b) => ({ ...b, logoUrl: data.logo_url }));
      })();
      return () => { dropped = true; };
    }
    let cancelled = false;
    void (async () => {
      const data = await fetchTenantBrand();
      if (cancelled) return;
      setBrand({
        loading: false,
        isTenant: true,
        // Falls back to their own hostname so the mark slot is never empty. A
        // tenant who has set neither a logo nor a name still gets something
        // that is theirs — an empty corner reads as broken, not as
        // unconfigured. Still never the parent platform's mark.
        brandName: data?.brand_name?.trim() || tenantHostLabel(),
        logoUrl: data?.logo_url || null,
      });
    })();
    return () => { cancelled = true; };
  }, [serverHost]);

  return brand;
}
