import type { ReactNode } from 'react'

export const metadata = {
  title: 'Standard Account — TuskaEx',
  description: 'Commission-free trading with competitive spreads. Perfect for new traders.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
