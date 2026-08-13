import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Open Trading Account', 'Choose your account type and open a new trading account.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
