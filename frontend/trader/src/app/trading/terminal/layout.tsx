import { appMetadata } from '@/lib/appMetadata'
import type { ReactNode } from 'react'

/* MetaTrader 5 chrome for the terminal, scoped to `.mt5`.
 *
 * Imported here rather than from globals.css so the ~350 lines of window
 * chrome are only shipped on the route that uses them — the same pattern the
 * marketing layout uses for styles/marketing.css. Importing it from a layout
 * also lands it after globals.css in the cascade, which is what lets its
 * `!important` shape reset beat the Tailwind utilities it is undoing. */
import '@/styles/mt5.css'

export async function generateMetadata() {
  return appMetadata('Trading Terminal', 'Professional trading terminal: charts, order panel, positions, and watchlists.')
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
