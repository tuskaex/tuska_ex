import type { ReactNode } from 'react'

export const metadata = {
  title: 'Sign In — TuskaEx',
  description: 'Sign in to your TuskaEx trading account.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
