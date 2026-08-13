import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Dashboard', 'Account overview, positions, and quick access to trading.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
