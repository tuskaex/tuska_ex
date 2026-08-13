import type { ReactNode } from 'react'

export const metadata = {
  title: 'Demo Account',
  description: 'Practice trading with $100,000 in virtual funds. Zero risk, real markets.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
