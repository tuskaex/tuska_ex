'use client';

import { useEffect } from 'react';
import { useTenantBrand } from '@/hooks/useTenantBrand';

/**
 * Puts the tenant's own logo in the browser tab.
 *
 * The root layout can only decide the favicon from the hostname, because
 * naming the tenant needs a lookup and metadata has to render without one. So
 * it serves tenants a transparent placeholder — never TuskaEx's mark — and
 * this component fills in the real logo once `useTenantBrand` has resolved who
 * owns the domain.
 *
 * Renders nothing. It mutates the existing <link rel="icon"> rather than adding
 * another, because browsers pick among multiple icon links unpredictably and a
 * leftover placeholder could win.
 *
 * No-op on TuskaEx's own hosts: `app/icon.png` is already correct there, and
 * rewriting it would only risk breaking it.
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
    // Keep the first, drop the rest: Next may emit several (icon, shortcut
    // icon, apple-touch-icon) and leaving stale ones lets the browser choose
    // the placeholder over the real logo.
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
