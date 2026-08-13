import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Portfolio', 'Open positions, P&L breakdown, and historical performance.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
