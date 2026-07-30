import type { ReactNode } from 'react'

export const metadata = {
  title: 'Shared Trade — TuskaEx',
  description: 'A trader shared this position with you.',
  openGraph: {
    title: 'Shared Trade on TuskaEx',
    description: 'View a position card a TuskaEx trader shared.',
    type: 'website',
  },
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
