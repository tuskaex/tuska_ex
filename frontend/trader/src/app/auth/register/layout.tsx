import type { ReactNode } from 'react'
import { authMetadata } from '../metadata'

/** Per request, not a constant — see app/auth/metadata.ts. */
export async function generateMetadata() {
  return authMetadata({
    platformTitle: 'Create Account — TuskaEx',
    platformDescription: 'Open a TuskaEx trading account in under 2 minutes.',
    neutralTitle: 'Create Account',
    neutralDescription: 'Open a trading account in under 2 minutes.',
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
