import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { appMetadata } from '@/lib/appMetadata'
import { isTenantHost } from '@/lib/tenantHost'

/**
 * The openGraph block is the visible half of this page: it is what renders when
 * the link is pasted into WhatsApp or Twitter. Naming TuskaEx there put the
 * parent platform into every share a broker's trader sent to their own
 * contacts — the widest-travelling leak of the lot, since the card outlives the
 * click.
 */
export async function generateMetadata() {
  const tenant = isTenantHost((await headers()).get('host'))
  return {
    ...(await appMetadata('Shared Trade', 'A trader shared this position with you.')),
    openGraph: {
      title: tenant ? 'Shared Trade' : 'Shared Trade on TuskaEx',
      description: tenant
        ? 'View a position card a trader shared.'
        : 'View a position card a TuskaEx trader shared.',
      type: 'website',
    },
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
