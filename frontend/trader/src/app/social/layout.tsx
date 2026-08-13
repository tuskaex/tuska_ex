import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Social Trading', 'Follow top traders, copy their positions, and share your own strategies.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
