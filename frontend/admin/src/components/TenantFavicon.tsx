'use client';

import { useEffect } from 'react';
import { useTenantBrand } from '@/hooks/useTenantBrand';
import { monogram } from '@/lib/tenantBrand';

/** A single-letter tab icon as an inline SVG data URI. Returns '' for an empty
 *  letter so the caller keeps the placeholder rather than setting a blank one. */
function monogramIcon(letter: string): string {
  if (!letter) return '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="#E11D2E"/>` +
    `<text x="32" y="33" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,sans-serif"` +
    ` font-size="38" font-weight="600" text-anchor="middle"` +
    ` dominant-baseline="central">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
    // No uploaded logo ⇒ draw their initial rather than leave the transparent
    // placeholder, which renders as an empty square and looks like a failed
    // load. Inline SVG so there is no request to fail. Still never TuskaEx's
    // mark, which is the whole point of this component.
    const href = brand.logoUrl || monogramIcon(monogram(brand.brandName));
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
  }, [brand.isTenant, brand.loading, brand.logoUrl, brand.brandName]);

  return null;
}
