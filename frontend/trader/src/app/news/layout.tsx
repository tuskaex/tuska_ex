import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Market News', 'Live market news, economic events, and trading commentary.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
