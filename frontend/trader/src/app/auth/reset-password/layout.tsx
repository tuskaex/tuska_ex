import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Reset Password', 'Reset your TuskaEx account password.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
