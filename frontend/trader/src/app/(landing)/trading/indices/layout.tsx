import type { ReactNode } from 'react'

export const metadata = {
  title: 'Trade Indices — TuskaEx',
  description: 'Global stock indices including S&P 500, NASDAQ, DAX, and FTSE.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
