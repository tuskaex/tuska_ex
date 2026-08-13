import type { ReactNode } from 'react'
import { appMetadata } from '@/lib/appMetadata'

export async function generateMetadata() {
  return {
    ...(await appMetadata('Impersonate', 'Operator impersonation handoff.')),
    robots: { index: false, follow: false },
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
