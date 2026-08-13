import type { ReactNode } from 'react'

export const metadata = {
  title: 'Trade Forex',
  description: '50+ currency pairs with leverage up to 1:500 and spreads from 0.0 pips.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
