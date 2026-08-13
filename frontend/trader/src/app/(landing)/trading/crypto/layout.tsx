import type { ReactNode } from 'react'

export const metadata = {
  title: 'Trade Cryptocurrencies',
  description: '24/7 crypto CFDs on BTC, ETH and major altcoins with leverage up to 1:100.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
