import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { isTenantHost } from '@/lib/tenantHost'

/**
 * PWA manifest — the name and icon a phone shows after "Add to home screen".
 *
 * This was constant, so a broker's client who installed their broker's site
 * ended up with a TuskaEx-named, TuskaEx-iconed app on their home screen. That
 * is the most durable leak of the lot: the login page is a moment, an installed
 * icon sits on their phone until they delete it.
 *
 * On a tenant host the wording goes neutral and the platform icon is dropped
 * rather than swapped for the tenant's. Naming them here would need a lookup
 * per request, and unlike the favicon there is no client-side second chance —
 * the browser reads this file once, at install time. A neutral name installs
 * honestly; the platform's name would install a lie.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get('host')
  const tenant = isTenantHost(host)

  if (tenant) {
    return {
      name: 'Trading Platform',
      short_name: 'Trading',
      description: 'Forex and CFD trading platform',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#D60101',
      icons: [],
    }
  }

  return {
    name: 'TuskaEx — Professional Trading Platform',
    short_name: 'TuskaEx',
    description: 'Professional forex and CFD trading platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#D60101',
    icons: [
      { src: '/marketing/tuskaex_fevicon.png', sizes: 'any', type: 'image/png' },
    ],
  }
}
