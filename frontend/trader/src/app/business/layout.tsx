import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Business Dashboard', 'IB partner stats, commissions, and referral analytics.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
