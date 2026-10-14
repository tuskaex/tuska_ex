import type { ReactNode } from 'react'
import { authMetadata } from '../metadata'

export async function generateMetadata() {
  return authMetadata({
    title: 'Sign In',
    platformDescription: 'Choose how to sign in to your TuskaEx trading account.',
    neutralDescription: 'Choose how to sign in to your trading account.',
  })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
