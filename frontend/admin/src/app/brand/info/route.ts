import { NextResponse } from 'next/server';
import { logoUrlFor, resolveBrand, servedHost } from '@/lib/brandServer';

export const dynamic = 'force-dynamic';

/** Who this admin host belongs to: name, theme colour and a same-origin logo URL. */
export async function GET(): Promise<NextResponse> {
  const { brand } = await resolveBrand(await servedHost());
  return NextResponse.json(
    {
      brand_name: brand?.brand_name ?? null,
      brand_color: brand?.brand_color ?? null,
      logo_url: logoUrlFor(brand?.logo_url),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
