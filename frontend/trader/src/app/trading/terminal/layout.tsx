import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Trading Terminal', 'Professional trading terminal: charts, order panel, positions, and watchlists.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
