'use client';

import { useEffect, useState } from 'react';
import {
  BRAND_NAME,
  TERMINAL_BRAND_LOGO,
  TERMINAL_BRAND_NAME,
} from '@/config/brand';
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
export function useTenantBrand(serverHost?: string | null): TenantBrand {
  const [brand, setBrand] = useState<TenantBrand>(() =>
    // Decided synchronously from the hostname, so the first paint is already
    // correct on the platform and already blank (not wrong) on a tenant.
    isTenantHost(serverHost)
      ? { loading: true, isTenant: true, brandName: '', logoUrl: null }
      : PLATFORM_BRAND,
  );

  useEffect(() => {
    if (!isTenantHost(serverHost)) return;
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
  }, [serverHost]);

  return brand;
}

/**
 * The brand name to PRINT — the tenant's on their own domain, TuskaEx on ours.
 *
 * Copy scattered across the app named the platform outright: the dashboard
 * footer's copyright, the KYC blurb, the affiliate pitch, the welcome toast.
 * Each one was invisible in a scan for logos and each one told a broker's
 * client whose platform they were actually on.
 *
 * While a tenant's brand is still resolving this returns an empty string rather
 * than "TuskaEx", so a sentence renders a beat late instead of naming the wrong
 * company and correcting itself. Call sites that need a guaranteed non-empty
 * label pass a fallback.
 */
export function useBrandName(fallbackWhileLoading = ''): string {
  const brand = useTenantBrand();
  if (!brand.isTenant) return BRAND_NAME;
  if (brand.loading) return fallbackWhileLoading;
  return brand.brandName || fallbackWhileLoading;
}

/**
 * The brand the CHART wears — its exchange label and its watermark.
 *
 * Three answers, and they are all different:
 *
 *   white-label domain  → the tenant's own name and logo
 *   anywhere else       → SpeedTrade, because that is the terminal's product
 *
 * Note this deliberately does NOT return TuskaEx. `useTenantBrand` answers
 * "whose site is this?", which for the CRM is TuskaEx and stays that way. The
 * chart only ever renders inside the terminal, and the terminal is SpeedTrade
 * (see TERMINAL_BRAND_NAME). Reusing `useBrandName` here would have put the
 * parent platform's name on a SpeedTrade chart.
 *
 * A tenant whose brand has not resolved yet returns an empty name and a null
 * logo, so the watermark renders nothing for a beat rather than flashing a
 * different company's mark at the broker's own client — the same rule the rest
 * of the branding code follows.
 */
export function useChartBrand(): { name: string; logoUrl: string | null } {
  const brand = useTenantBrand();
  if (!brand.isTenant) {
    return { name: TERMINAL_BRAND_NAME, logoUrl: TERMINAL_BRAND_LOGO };
  }
  if (brand.loading) return { name: '', logoUrl: null };
  return { name: brand.brandName, logoUrl: brand.logoUrl };
}
