import { NextResponse } from 'next/server';
import { fetchLogo, resolveBrand, servedHost } from '@/lib/brandServer';

export const dynamic = 'force-dynamic';

/**
 * This host's logo, streamed from the admin service. Resolved from the Host
 * every time — the `v` query is only a cache key — so it can never be used to
 * read another tenant's file.
 */
export async function GET(): Promise<NextResponse> {
  const { brand } = await resolveBrand(await servedHost());
  const logo = await fetchLogo(brand?.logo_url);
  if (!logo) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new NextResponse(logo.body, {
    headers: { 'Content-Type': logo.type, 'Cache-Control': 'public, max-age=3600' },
  });
}
