import { NextResponse } from 'next/server';

/**
 * Does an ACTIVE white-label broker own this host?
 *
 * A broker who is deleted or suspended loses their domain; nginx may still
 * route it here, but the site must then be gone, not a generic login page.
 * Asked of the admin service over the internal network (middleware runs on
 * the Node runtime, so the env is read at request time) and cached briefly.
 *
 * Fails OPEN: if the admin service cannot be reached the site stays up — an
 * outage of the lookup must never take every live broker offline.
 */
const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { live: boolean; at: number }>();

function adminApiBase(): string {
  return (
    process.env.ADMIN_API_INTERNAL_URL ||
    process.env.ADMIN_API_PROXY_TARGET ||
    'http://admin-api:8001'
  ).replace(/\/$/, '');
}

export async function tenantHostIsLive(host: string): Promise<boolean> {
  const key = (host.split(':')[0] || host).toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.live;
  try {
    const res = await fetch(
      `${adminApiBase()}/api/v1/public/branding/by-domain?domain=${encodeURIComponent(key)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return true;
    const data = (await res.json()) as { active?: boolean };
    // An older API without the flag answers undefined: treat as live.
    const live = data?.active !== false;
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { live, at: Date.now() });
    return live;
  } catch {
    return true;
  }
}

/** What a domain with no live broker serves: nothing but a plain 404. */
export function siteNotAvailable(): NextResponse {
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Site not available</title>' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0f19;color:#cbd5e1}' +
    'h1{font-size:18px;font-weight:600;margin:0 0 6px;color:#f1f5f9}p{margin:0;font-size:14px}</style></head>' +
    '<body><div style="text-align:center"><h1>This site is not available</h1>' +
    '<p>The website you are looking for does not exist or has been removed.</p></div></body></html>';
  return new NextResponse(html, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
