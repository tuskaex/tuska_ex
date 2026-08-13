import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Risk Calculator', 'Calculate position size, pip value, and margin requirements.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
