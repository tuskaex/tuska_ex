import type { ReactNode } from 'react'

export const metadata = {
  title: 'Trading Overview — TuskaEx',
  description: 'Asset classes, execution model, spreads, and account types — at a glance.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
