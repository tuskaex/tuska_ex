import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Transactions', 'Deposits, withdrawals, trades, and fee history.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
