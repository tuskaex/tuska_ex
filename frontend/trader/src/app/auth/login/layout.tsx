import type { ReactNode } from 'react'
import { authMetadata } from '../metadata'

/**
 * Resolved per request rather than exported as a constant: a static
 * `title: 'Sign In — TuskaEx'` puts the parent platform's name in the browser
 * tab of every white-label tenant's login page.
 */
export async function generateMetadata() {
  return authMetadata({
    platformTitle: 'Sign In — TuskaEx',
    platformDescription: 'Sign in to your TuskaEx trading account.',
    neutralTitle: 'Sign In',
    neutralDescription: 'Sign in to your trading account.',
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
