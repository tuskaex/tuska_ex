import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

export async function generateMetadata() {
  return appMetadata('Identity Verification', 'KYC verification: upload ID documents and proof of address.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
