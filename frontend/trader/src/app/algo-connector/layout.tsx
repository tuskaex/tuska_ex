import type { ReactNode } from 'react'
import { appMetadata } from '@/lib/appMetadata'

export async function generateMetadata() {
  return appMetadata('Algo Connector', 'Connect trading algorithms and bots to your account.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
