import type { ReactNode } from 'react'

export const metadata = {
  title: 'My Accounts — TuskaEx',
  description: 'View, manage, and switch between your trading accounts.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
