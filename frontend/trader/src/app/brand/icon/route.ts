import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isTenantHost } from '@/lib/tenantHost';

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

/** Small: a logo that misses this is not a favicon. */
const MAX_BYTES = 512 * 1024;
const UPSTREAM_TIMEOUT_MS = 2500;

/** Long enough not to re-fetch on every navigation, short enough that a tenant
 *  who uploads a new logo sees it the same session. */
const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

type PublicBranding = { brand_name: string | null; logo_url: string | null };

/**
 * Branding lives on the ADMIN service, which this app does not otherwise talk
 * to — the gateway proxy in front of every other server call does not carry
 * `/api/v1/public/branding`. Hence its own variable, set alongside the gateway
 * one in docker-compose.
 */
function adminApiBase(): string {
  return (
    process.env.ADMIN_API_INTERNAL_URL ||
    process.env.ADMIN_API_PROXY_TARGET ||
    'http://admin-api:8001'
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

/** First letter of the brand, or of their own domain when they have set no
 *  name. Their hostname is the one thing we always know and it is factually
 *  theirs; an empty tile reads as broken rather than as unconfigured. */
function initial(brandName: string | null | undefined, host: string): string {
  const label =
    (brandName ?? '').trim() ||
    (host.split(':')[0] ?? host).replace(/^(www|app|trade)\./, '');
  return (label.trim()[0] ?? '').toUpperCase() || '?';
}

function monogramResponse(letter: string): NextResponse {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="#E11D2E"/>` +
    `<text x="32" y="33" fill="#fff" font-family="system-ui,-apple-system,Segoe UI,sans-serif"` +
    ` font-size="38" font-weight="600" text-anchor="middle"` +
    ` dominant-baseline="central">${letter}</text></svg>`;
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': CACHE },
  });
}

export async function GET(): Promise<NextResponse> {
  const host = await servedHost();

  // TuskaEx's own hosts: `src/app/icon.png` is already right. A relative
  // Location keeps this correct behind the proxy, where the request URL this
  // handler sees is the internal one, not the address the browser used.
  if (!isTenantHost(host)) {
    return new NextResponse(null, {
      status: 307,
      headers: { Location: '/icon.png', 'Cache-Control': CACHE },
    });
  }

  const domain = host.split(':')[0] || host;
  const brand = await getJson(
    `${adminApiBase()}/api/v1/public/branding/by-domain?domain=${encodeURIComponent(domain)}`,
  );

  const logoPath = brand?.logo_url?.trim();
  if (logoPath) {
    try {
      // `logo_url` is a site-relative path (/api/v1/admin/branding/media/…)
      // that a browser resolves against the tenant's own origin. Server side
      // there is no origin to resolve against, so it is joined to the admin
      // service directly — the same bytes, one hop fewer.
      const res = await fetch(`${adminApiBase()}${logoPath}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0 && buf.byteLength <= MAX_BYTES) {
          return new NextResponse(buf, {
            headers: {
              'Content-Type': res.headers.get('content-type') || 'image/png',
              'Cache-Control': CACHE,
            },
          });
        }
      }
    } catch {
      // fall through to the monogram
    }
  }

  return monogramResponse(initial(brand?.brand_name, host));
}
