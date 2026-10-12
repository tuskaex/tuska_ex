import { NextResponse } from 'next/server';
import { fetchLogo, resolveBrand, servedHost } from '@/lib/brandServer';

/**
 * The tab icon for whichever brand this host belongs to, resolved on the
 * server.
 *
 * The trader app had no tenant favicon in its metadata at all: `app/icon.png`
 * is one file served to every host, so the first HTML a broker's own client
 * received named TuskaEx, and a client component then rewrote the <link> once
 * the branding fetch came back. Two problems with that, and the second is the
 * one people reported. A visitor on a tenant domain saw the PARENT PLATFORM's
 * logo in the tab for the first second — the exact leak white-labelling exists
 * to prevent — and because the swap edited an existing link's `href` in place,
 * Chrome routinely ignored it and the real logo appeared only after a reload.
 *
 * Pointing `icons.icon` at this route moves the lookup behind a URL. The
 * browser fetches the favicon during the first page load, the way it always
 * does, and what comes back is already the right one. Nothing to swap, nothing
 * to reload, and no moment where the wrong brand is on screen.
 *
 * The URL is a constant, which is what keeps this out of the root layout. That
 * layout is deliberately static — calling `headers()` there opts every
 * marketing route into dynamic rendering and cost the site 65 of its 67
 * prerendered pages once before. A fixed string in `metadata` changes nothing
 * about how the pages render.
 *
 * NEVER falls back to TuskaEx's mark on a tenant host: a failed lookup gives
 * the brand's initial on a tile, so the worst case is "not their logo", never
 * "somebody else's brand".
 */

export const dynamic = 'force-dynamic';

/** Long enough not to re-fetch on every navigation, short enough that a tenant
 *  who uploads a new logo sees it the same session. */
const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

/** First letter of the brand, or of their own domain when they have set no
 *  name. Their hostname is the one thing we always know and it is factually
 *  theirs; an empty tile reads as broken rather than as unconfigured. */
function initial(brandName: string | null | undefined, host: string): string {
  const label =
    (brandName ?? '').trim() ||
    (host.split(':')[0] ?? host).replace(/^(www|app|trade)\./, '');
  return (label.trim()[0] ?? '').toUpperCase() || '?';
}

function monogramResponse(letter: string, color?: string | null): NextResponse {
  // Only a strict hex reaches the SVG; the API stores nothing else, but this
  // string is interpolated into markup.
  const fill = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#E11D2E';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${fill}"/>` +
    `<text x="32" y="33" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,sans-serif"` +
    ` font-size="38" font-weight="600" text-anchor="middle"` +
    ` dominant-baseline="central">${letter}</text></svg>`;
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

  // TuskaEx's own host with no uploaded logo: the bundled icon. A relative
  // Location keeps this correct behind the proxy.
  if (!isTenant) {
    return new NextResponse(null, {
      status: 307,
      headers: { Location: '/icon.png', 'Cache-Control': CACHE },
    });
  }
  return monogramResponse(initial(brand?.brand_name, host), brand?.brand_color);
}
