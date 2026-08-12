'use client';

import { useEffect, useState } from 'react';
import {
  fetchTenantBrand,
  isTenantAdminHost,
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
 * On TuskaEx's own host it returns immediately and never touches the network.
 * On a tenant's host it starts in `loading` with no brand, then fills in.
 *
 * `loading` is the point: it lets callers render nothing rather than the
 * parent platform's logo. A tenant seeing TuskaEx's wordmark flash inside the
 * panel they were sold as their own is worse than seeing an empty space.
 */
export function useTenantBrand(): TenantBrand {
  const [brand, setBrand] = useState<TenantBrand>(() =>
    typeof window !== 'undefined' && isTenantAdminHost()
      ? { loading: true, isTenant: true, brandName: '', logoUrl: null }
      : PLATFORM,
  );

  useEffect(() => {
    if (!isTenantAdminHost()) return;
    let cancelled = false;
    void (async () => {
      const data = await fetchTenantBrand();
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
