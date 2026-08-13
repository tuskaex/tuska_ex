import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Wallet', 'Deposit, withdraw, and manage funds across your trading accounts.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
