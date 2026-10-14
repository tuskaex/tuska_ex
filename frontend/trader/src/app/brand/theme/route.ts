import { NextResponse } from 'next/server';

/**
 * TuskaEx's own theme colour, set on Admin → Platform brand.
 *
 * The browser cannot ask admin-api for it directly on the platform's own
 * hosts: nginx routes /api/v1/public/branding/ to admin-api only on tenant
 * vhosts. Same reason, and same server-side hop, as /brand/icon. Tenant
 * domains do not use this route; they read their colour from by-domain.
 */

export const dynamic = 'force-dynamic';

const UPSTREAM_TIMEOUT_MS = 2500;
const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

function adminApiBase(): string {
  return (
    process.env.ADMIN_API_INTERNAL_URL ||
    process.env.ADMIN_API_PROXY_TARGET ||
    'http://admin-api:8001'
  ).replace(/\/$/, '');
}

export async function GET(): Promise<NextResponse> {
  let color: string | null = null;
  try {
    const res = await fetch(`${adminApiBase()}/api/v1/public/branding/platform`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = (await res.json()) as { brand_color?: string | null };
      // Only a strict hex leaves this route; it ends up in CSS.
      if (data.brand_color && /^#[0-9A-Fa-f]{6}$/.test(data.brand_color)) color = data.brand_color;
    }
  } catch {
    /* No colour: the app keeps its compiled-in blue. */
  }
  return NextResponse.json({ brand_color: color }, { headers: { 'Cache-Control': CACHE } });
}
