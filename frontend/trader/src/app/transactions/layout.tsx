import type { ReactNode } from 'react'

export const metadata = {
  title: 'Transactions — TuskaEx',
  description: 'Deposits, withdrawals, trades, and fee history.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
