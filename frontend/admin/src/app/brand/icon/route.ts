import { NextResponse } from 'next/server';
import { tenantHostLabel, monogram } from '@/lib/tenantBrand';
import { fetchLogo, resolveBrand, servedHost } from '@/lib/brandServer';

/**
 * The tab icon for whichever brand this host belongs to, resolved on the
 * server.
 *
 * The panel used to ship a transparent placeholder and let a client component
 * swap in the real logo after `/api/v1/public/branding/by-domain` answered in
 * the browser. That works, but only after the round trip: the tenant watched an
 * empty tab for a second, and if the swap raced the browser's own favicon read
 * they had to reload the page to see their mark at all.
 *
 * Pointing `icons.icon` at this route moves the whole lookup behind a URL. The
 * browser fetches the favicon as part of the first page load, the way it always
 * does, and what comes back is already correct. Nothing to swap, nothing to
 * reload.
 *
 * Why a route and not `generateMetadata` resolving the logo directly: the URL
 * is a constant, so the layout stays free of a per-render backend call that
 * would sit in front of the first byte of HTML on every page. Here a slow or
 * dead admin service delays one image, and the page has already painted.
 *
 * NEVER falls back to TuskaEx's mark on a tenant host. A failed lookup gives
 * their initial on a coloured tile — the same monogram the sidebar draws — so
 * the worst case is "not their logo", never "somebody else's brand".
 */

export const dynamic = 'force-dynamic';

/** Long enough that the tab icon is not re-fetched on every navigation, short
 *  enough that a tenant who uploads a new logo sees it the same session. */
const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

/** A single-letter tile, as SVG. No request to fail, no bytes to be missing. */
function monogramResponse(letter: string, color?: string | null): NextResponse {
  const glyph = letter || '?';
  const fill = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#E11D2E';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${fill}"/>` +
    `<text x="32" y="33" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,sans-serif"` +
    ` font-size="38" font-weight="600" text-anchor="middle"` +
    ` dominant-baseline="central">${glyph}</text></svg>`;
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': CACHE },
  });
}

export async function GET(): Promise<NextResponse> {
  const host = await servedHost();
  const { isTenant, brand } = await resolveBrand(host);

  // Any logo up to the upload limit: the old 512 KB cap silently turned most
  // real uploads into a letter tile.
  const logo = await fetchLogo(brand?.logo_url);
  if (logo) {
    return new NextResponse(logo.body, {
      headers: { 'Content-Type': logo.type, 'Cache-Control': CACHE },
    });
  }

  if (!isTenant) {
    // A relative Location keeps this correct behind the proxy.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: '/icon.png', 'Cache-Control': CACHE },
    });
  }
  return monogramResponse(
    monogram(brand?.brand_name?.trim() || tenantHostLabel(host)),
    brand?.brand_color,
  );
}
