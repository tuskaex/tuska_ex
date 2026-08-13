import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('My Accounts', 'View, manage, and switch between your trading accounts.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
