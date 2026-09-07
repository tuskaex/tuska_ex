import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isTenantAdminHost, tenantHostLabel, monogram } from '@/lib/tenantBrand';

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

/** Small: a logo that misses this is not a favicon. Guards against streaming
 *  something huge into a tab icon if a tenant uploads a poster. */
const MAX_BYTES = 512 * 1024;
const UPSTREAM_TIMEOUT_MS = 2500;

/** Long enough that the tab icon is not re-fetched on every navigation, short
 *  enough that a tenant who uploads a new logo sees it the same session. */
const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

type PublicBranding = { brand_name: string | null; logo_url: string | null };

function adminApiBase(): string {
  return (
    process.env.ADMIN_API_PROXY_TARGET ||
    process.env.ADMIN_API_INTERNAL_URL ||
    'http://127.0.0.1:8001'
  ).replace(/\/$/, '');
}

/** The hostname this request was served as. X-Forwarded-Host first, because
 *  nginx terminates for us and `Host` is then the upstream name. */
async function servedHost(): Promise<string> {
  const h = await headers();
  const fwd = (h.get('x-forwarded-host') ?? '').split(',')[0]?.trim();
  return (fwd || h.get('host') || '').toLowerCase().trim();
}

async function getJson(url: string): Promise<PublicBranding | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBranding;
  } catch {
    return null;
  }
}

/** A single-letter tile, as SVG. No request to fail, no bytes to be missing. */
function monogramResponse(letter: string): NextResponse {
  const glyph = letter || '?';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="#E11D2E"/>` +
    `<text x="32" y="33" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,sans-serif"` +
    ` font-size="38" font-weight="600" text-anchor="middle"` +
    ` dominant-baseline="central">${glyph}</text></svg>`;
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': CACHE },
  });
}

/** The bytes behind a `logo_url`, or null to fall back.
 *
 * `logo_url` is a site-relative path (/api/v1/admin/branding/media/…) that a
 * browser resolves against its own origin. Server side there is no origin to
 * resolve against, so it is joined to the admin service directly — the same
 * bytes, one hop fewer, and it works before nginx has a vhost for a domain
 * still being connected.
 */
async function serveLogo(logoPath: string | null | undefined): Promise<NextResponse | null> {
  const path = logoPath?.trim();
  if (!path) return null;
  try {
    const res = await fetch(`${adminApiBase()}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
    return new NextResponse(buf, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/png',
        'Cache-Control': CACHE,
      },
    });
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const host = await servedHost();
  const isTenant = isTenantAdminHost(host);

  // TuskaEx's own host. The platform now has a settable brand of its own —
  // Platform brand → Upload logo writes `find_platform_brand`'s row — so ask
  // for it before falling back to the bundled `src/app/icon.png`.
  if (!isTenant) {
    const platform = await getJson(`${adminApiBase()}/api/v1/public/branding/platform`);
    const served = await serveLogo(platform?.logo_url);
    if (served) return served;
    // A relative Location keeps this correct behind the proxy, where the
    // request URL this handler sees is the internal one, not the address the
    // browser used.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: '/icon.png', 'Cache-Control': CACHE },
    });
  }

  const domain = host.split(':')[0] || host;
  const brand = await getJson(
    `${adminApiBase()}/api/v1/public/branding/by-domain?domain=${encodeURIComponent(domain)}`,
  );

  const served = await serveLogo(brand?.logo_url);
  if (served) return served;

  return monogramResponse(monogram(brand?.brand_name?.trim() || tenantHostLabel(host)));
}
