import type { ReactNode } from 'react'

export const metadata = {
  title: 'Web Trading Platform',
  description: 'Trade from any browser with no installation. Full-featured terminal in your tab.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
