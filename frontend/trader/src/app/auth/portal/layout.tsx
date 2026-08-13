import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Sign In', 'Choose how to sign in to your TuskaEx trading account.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
