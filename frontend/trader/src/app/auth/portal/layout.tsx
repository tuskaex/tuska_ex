import type { ReactNode } from 'react'

export const metadata = {
  title: 'Sign In — TuskaEx',
  description: 'Choose how to sign in to your TuskaEx trading account.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
