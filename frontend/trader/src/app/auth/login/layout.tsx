import type { ReactNode } from 'react'
import { authMetadata } from '../metadata'

/**
 * Resolved per request rather than exported as a constant: a static
 * `title: 'Sign In'` puts the parent platform's name in the browser
 * tab of every white-label tenant's login page.
 */
export async function generateMetadata() {
  return authMetadata({
    title: 'Sign In',
    platformDescription: 'Sign in to your TuskaEx trading account.',
    neutralDescription: 'Sign in to your trading account.',
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
