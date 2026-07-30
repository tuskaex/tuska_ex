import type { ReactNode } from 'react'

export const metadata = {
  title: 'Support — TuskaEx',
  description: 'Contact support, browse FAQs, and find platform documentation.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
