import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('More', 'Additional tools, settings, and account features.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
