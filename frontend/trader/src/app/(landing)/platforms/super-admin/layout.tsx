import type { ReactNode } from 'react'

export const metadata = {
  title: 'Super Admin Console — TuskaEx',
  description: 'Operator dashboard for trade ops, risk management, and user administration.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
