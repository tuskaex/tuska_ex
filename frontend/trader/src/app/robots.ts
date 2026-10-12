import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { isTenantHost } from '@/lib/tenantHost'

/**
 * Crawler directives. Allow the marketing surface (home + 8 light pages
 * + dark marketing trading/platforms/protocol routes), block
 * everything authenticated. Search engines have no business indexing
 * /dashboard or /wallet — those require login anyway, but disallowing
 * them keeps the crawl budget on the marketing pages.
 */
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // A white-label domain is a login page only; nothing on it should be
  // indexed, and it must not advertise the parent's sitemap.
  if (isTenantHost((await headers()).get('host'))) {
    return { rules: [{ userAgent: '*', disallow: ['/'] }] }
  }

  const host = process.env.NEXT_PUBLIC_MARKETING_HOST
    ? `https://${process.env.NEXT_PUBLIC_MARKETING_HOST}`
    : 'https://tuskaex.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/kyc',
          '/wallet',
          '/portfolio',
          '/transactions',
          '/profile',
          '/trading/terminal',
          '/trading/open-account',
          // Auth-gated staging route: mints a handoff code and redirects to
          // the terminal domain. Nothing to index, and a crawler hitting it
          // burns a code mint per request.
          '/terminal',
          '/social',
          '/news',
          '/business',
          '/pamm',
          '/accounts',
          '/support',
          '/more',
          '/risk-calculator',
          '/s/',
        ],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  }
}
