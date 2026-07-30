import type { ReactNode } from 'react'

export const metadata = {
  title: 'TuskaEx Protocol — Trading Infrastructure',
  description: 'The execution, settlement, and risk infrastructure behind TuskaEx.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
