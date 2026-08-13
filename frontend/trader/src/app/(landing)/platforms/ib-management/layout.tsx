import type { ReactNode } from 'react'

export const metadata = {
  title: 'IB Management',
  description: 'Introducing-broker portal with multi-tier commissions and real-time reporting.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
