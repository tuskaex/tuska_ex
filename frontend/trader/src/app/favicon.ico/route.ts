import { NextResponse } from 'next/server';

/** Browsers and crawlers request /favicon.ico directly; send them to the
 *  brand-aware icon so a tenant domain never gets a 404 or the wrong mark. */
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: '/brand/icon?v=2', 'Cache-Control': 'public, max-age=300' },
  });
}
