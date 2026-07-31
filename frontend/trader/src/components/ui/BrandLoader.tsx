import Image from 'next/image'
import { BRAND_LOGO, BRAND_LOGO_LIGHT } from '@/config/brand'

/**
 * Centred TuskaEx logo for route-level loading states.
 *
 * Next.js renders a segment's `loading.tsx` while that segment's server
 * work is in flight. Before this existed the app had `error.tsx` and
 * `not-found.tsx` but no loading boundary anywhere, so a slow navigation
 * showed the previous page frozen with only the 3px TopLoader bar moving
 * — which reads as "the click didn't register", and gets clicked again.
 *
 * Deliberately NOT a client component: it renders once as static markup
 * and the animation is pure CSS, so it costs no JS on a route whose
 * whole problem is that it is still loading.
 *
 * `variant` picks the lockup, not a colour scheme — the stock logo is
 * black-on-transparent and disappears on a dark canvas, so dark surfaces
 * need the light lockup. Pass 'dark' on the terminal and the landing
 * home; 'light' everywhere else.
 */
export default function BrandLoader({
  variant = 'light',
  label = 'Loading',
  fullScreen = true,
}: {
  variant?: 'light' | 'dark'
  label?: string
  fullScreen?: boolean
}) {
  const isDark = variant === 'dark'
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`flex w-full items-center justify-center ${
        fullScreen ? 'min-h-screen' : 'min-h-[60vh]'
      } ${isDark ? 'bg-[#05070d]' : 'bg-white'}`}
    >
      <div className="relative flex flex-col items-center gap-7">
        {/* Brand-red bloom behind the mark, breathing in time with it */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[38px] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.30),transparent_70%)] motion-safe:animate-pulse"
        />

        <Image
          src={isDark ? BRAND_LOGO_LIGHT : BRAND_LOGO}
          alt="TuskaEx"
          width={710}
          height={187}
          priority
          className="relative h-auto w-44 motion-safe:animate-pulse sm:w-56"
        />

        {/* Determinate-looking track. The fill sweeps on a loop because
            there is no real progress figure to report here — Next gives
            no completion signal to a loading boundary. A bar that claimed
            a percentage would be inventing one. */}
        <span
          aria-hidden="true"
          className={`relative block h-[3px] w-40 overflow-hidden rounded-full ${
            isDark ? 'bg-white/10' : 'bg-gray-200'
          }`}
        >
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#D60101] to-transparent motion-safe:animate-[brandloader-sweep_1.15s_ease-in-out_infinite]" />
        </span>

        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}
