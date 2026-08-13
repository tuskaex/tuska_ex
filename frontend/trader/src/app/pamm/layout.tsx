import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('PAMM', 'Percentage Allocation Management Module: invest with proven money managers.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
