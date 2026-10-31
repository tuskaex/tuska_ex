import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves the licensed TradingView Charting Library to the admin panel's
 * indicator preview by proxying the trader frontend's copy
 * (frontend/trader/public/charting_library, untracked, put there at deploy).
 * One copy on the server instead of two that can drift apart, and deploy.sh
 * keeps checking a single place.
 *
 * The target is read at request time, not baked into a rewrite: rewrites are
 * fixed at `next build`, where the docker hostname is not known.
 */
function traderOrigin(): string {
  const raw = process.env.TRADER_FRONTEND_INTERNAL_URL || 'http://127.0.0.1:3010';
  return String(raw).replace(/\/$/, '');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const segments = (await params).path ?? [];
  if (!segments.length || segments.some((s) => s === '..' || s.includes('\\'))) {
    return new NextResponse(null, { status: 400 });
  }
  const url = `${traderOrigin()}/charting_library/${segments.map(encodeURIComponent).join('/')}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    console.error('[charting_library proxy]', url, e instanceof Error ? e.message : e);
    return new NextResponse(null, { status: 502 });
  }
  if (!res.ok) return new NextResponse(null, { status: res.status });

  const headers = new Headers();
  const ct = res.headers.get('content-type');
  if (ct) headers.set('content-type', ct);
  // Bundle file names carry a content hash; the entry file does not.
  const hashed = segments[0] === 'bundles';
  headers.set('cache-control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  return new NextResponse(res.body, { status: 200, headers });
}
