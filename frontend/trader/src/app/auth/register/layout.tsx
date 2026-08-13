import type { ReactNode } from 'react'
import { authMetadata } from '../metadata'

/** Per request, not a constant — see app/auth/metadata.ts. */
export async function generateMetadata() {
  return authMetadata({
    title: 'Create Account',
    platformDescription: 'Open a TuskaEx trading account in under 2 minutes.',
    neutralDescription: 'Open a trading account in under 2 minutes.',
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
