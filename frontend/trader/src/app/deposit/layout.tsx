import type { ReactNode } from 'react'
import { appMetadata } from '@/lib/appMetadata'

export async function generateMetadata() {
  return appMetadata('Deposit', 'Fund your trading account.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
