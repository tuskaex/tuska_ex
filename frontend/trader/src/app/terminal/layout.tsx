import type { ReactNode } from 'react'
import { appMetadata } from '@/lib/appMetadata'

/**
 * Host-aware title: on a white-label domain the tab must not carry the root
 * layout's " — TuskaEx" template suffix.
 */
export async function generateMetadata() {
  return appMetadata('Trading Terminal', 'Opening your trading terminal.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
