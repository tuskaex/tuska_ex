import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Support', 'Contact support, browse FAQs, and find platform documentation.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
