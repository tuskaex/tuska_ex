import type { ReactNode } from 'react'

export const metadata = {
  title: 'Prop Trading — TuskaEx',
  description: 'Funded trading challenges with profit splits up to 90%.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
