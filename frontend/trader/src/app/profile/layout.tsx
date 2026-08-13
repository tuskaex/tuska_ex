import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Profile', 'Personal information, security settings, and account preferences.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
