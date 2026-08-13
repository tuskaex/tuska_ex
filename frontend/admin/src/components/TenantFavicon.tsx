'use client';

import { useEffect } from 'react';
import { useTenantBrand } from '@/hooks/useTenantBrand';

/**
 * Puts the tenant's own logo in the browser tab of their admin panel.
 *
 * The sidebar and the login card already carried the tenant's mark, but the tab
 * icon still came from `src/app/icon.png` — the App Router file convention,
 * which is one file served to every host. So a broker signing into the panel
 * they were sold as their own saw TuskaEx's logo in the tab and in the address
 * bar, on every page.
 *
 * The layout cannot resolve this from the hostname alone: knowing WHICH tenant
 * needs a lookup, and metadata has to render without one. So it serves tenants
 * a transparent placeholder — never TuskaEx's mark — and this fills in the real
 * logo once `useTenantBrand` has answered.
 *
 * Renders nothing. It mutates the existing <link rel="icon"> rather than adding
 * another, because browsers pick among multiple icon links unpredictably and a
 * leftover placeholder could win.
 */
export default function TenantFavicon() {
  const brand = useTenantBrand();

  useEffect(() => {
    if (!brand.isTenant || brand.loading) return;
    const href = brand.logoUrl;
    if (!href) return;

    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
    );
    if (links.length === 0) {
      const el = document.createElement('link');
      el.rel = 'icon';
      el.href = href;
      document.head.appendChild(el);
      return;
    }
    links.forEach((el, i) => {
      if (i === 0) {
        el.href = href;
        el.removeAttribute('sizes');
        el.removeAttribute('type');
      } else {
        el.remove();
      }
    });
  }, [brand.isTenant, brand.loading, brand.logoUrl]);

  return null;
}
