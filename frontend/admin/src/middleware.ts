import { NextResponse, type NextRequest } from 'next/server';
import { isTenantAdminHost } from '@/lib/tenantBrand';
import { siteNotAvailable, tenantHostIsLive } from '@/lib/tenantLiveness';

/** A deleted or suspended broker's admin panel serves nothing at all. */
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase().split(':')[0] ?? '';
  if (isTenantAdminHost(host) && !(await tenantHostIsLive(host))) {
    return siteNotAvailable();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs',
};
