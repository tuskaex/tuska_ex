import type { ReactNode } from 'react'
import { authMetadata } from '../metadata'

export async function generateMetadata() {
  return authMetadata({
    title: 'Reset Password',
    platformDescription: 'Reset your TuskaEx account password.',
    neutralDescription: 'Reset your account password.',
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
