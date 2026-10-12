import { headers } from 'next/headers';
import { isTenantHost } from '@/lib/tenantHost';

/**
 * Server-side branding lookup, shared by /brand/info, /brand/logo and
 * /brand/icon.
 *
 * Branding lives on the admin service. The browser used to fetch it — and the
 * logo bytes — straight from /api/v1/public/branding/* and
 * /api/v1/admin/branding/media/*, which only work when nginx routes those two
 * paths to the admin API. Any vhost, port or upstream mistake broke every
 * logo at once, on every tenant. Here the lookup goes over the internal Docker
 * network instead, so nginx routing no longer matters.
 */

export type PublicBranding = {
  brand_name: string | null;
  logo_url: string | null;
  brand_color?: string | null;
};

const UPSTREAM_TIMEOUT_MS = 3000;
/** Matches branding_service.MAX_LOGO_BYTES (2 MB), with headroom. */
export const MAX_LOGO_BYTES = 3 * 1024 * 1024;

export function adminApiBase(): string {
  return (
    process.env.ADMIN_API_INTERNAL_URL ||
    process.env.ADMIN_API_PROXY_TARGET ||
    'http://admin-api:8001'
  ).replace(/\/$/, '');
}

/** The hostname the visitor used. nginx passes Host verbatim. */
export async function servedHost(): Promise<string> {
  const h = await headers();
  const fwd = (h.get('x-forwarded-host') ?? '').split(',')[0]?.trim();
  return (fwd || h.get('host') || '').toLowerCase().trim();
}

async function getJson(url: string): Promise<PublicBranding | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as PublicBranding;
  } catch {
    return null;
  }
}

/** The brand for `host`: a tenant's by domain, else the platform's own. */
export async function resolveBrand(host: string): Promise<{ isTenant: boolean; brand: PublicBranding | null }> {
  const isTenant = isTenantHost(host);
  if (!isTenant) {
    return { isTenant, brand: await getJson(`${adminApiBase()}/api/v1/public/branding/platform`) };
  }
  const domain = host.split(':')[0] || host;
  return {
    isTenant,
    brand: await getJson(`${adminApiBase()}/api/v1/public/branding/by-domain?domain=${encodeURIComponent(domain)}`),
  };
}

/** The bytes behind a stored `logo_url`, fetched from the admin service. */
export async function fetchLogo(
  logoPath: string | null | undefined,
  maxBytes = MAX_LOGO_BYTES,
): Promise<{ body: ArrayBuffer; type: string } | null> {
  const path = logoPath?.trim();
  if (!path) return null;
  const url = /^https?:\/\//i.test(path) ? path : `${adminApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!res.ok) return null;
    const body = await res.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > maxBytes) return null;
    return { body, type: res.headers.get('content-type') || 'image/png' };
  } catch {
    return null;
  }
}

/** Same-origin URL for the logo; `v` changes when a new file is uploaded. */
export function logoUrlFor(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const file = stored.split('/').pop() || stored;
  return `/brand/logo?v=${encodeURIComponent(file)}`;
}
