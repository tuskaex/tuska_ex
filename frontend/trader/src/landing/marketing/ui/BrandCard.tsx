'use client'

import Image from 'next/image'

/**
 * TuskaEx card mockup, drawn in CSS.
 *
 * Replaces /assets/hero page.png — a stock photo of a model holding a
 * SwissCresta-branded debit card. The competitor's logo and wordmark were
 * baked into the bitmap, so it could not be recoloured or retouched in
 * repo; the card is rebuilt here instead.
 *
 * Two cards are stacked for depth: a muted one behind, the live brand
 * card in front. Everything is markup, so it stays sharp at any DPI,
 * costs no image bytes, and the wordmark comes from the real logo asset
 * rather than being re-typed.
 */
export default function BrandCard({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-[1079/1458] w-full ${className}`}>
      {/* Back card — offset + rotated, reads as a second card in a stack */}
      <div
        aria-hidden="true"
        className="absolute left-[12%] top-[26%] w-[74%] rotate-[-14deg] rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]"
        style={{ aspectRatio: '1.586' }}
      />

      {/* Front card — 1.586:1 is the ISO/IEC 7810 ID-1 ratio real bank
          cards use, so the proportions read as a card and not a tile. */}
      <div
        className="absolute left-[20%] top-[34%] w-[78%] rotate-[-7deg] overflow-hidden rounded-2xl bg-[#0A0A0A] shadow-[0_30px_60px_-20px_rgba(214,1,1,0.5)] ring-1 ring-white/10"
        style={{ aspectRatio: '1.586' }}
      >
        {/* Brand-red bloom in the corner */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1/4 -top-1/2 h-[150%] w-[110%] rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.55),transparent_65%)]"
        />
        {/* Diagonal sheen */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.09)_50%,transparent_62%)]"
        />

        <div className="relative flex h-full flex-col justify-between p-[6%]">
          {/* Wordmark + contactless */}
          <div className="flex items-start justify-between">
            <Image
              src="/marketing/tuskaex-logo-light.png"
              alt="TuskaEx"
              width={710}
              height={187}
              className="h-auto w-[46%]"
              priority
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="w-[10%] text-white/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M8.5 6a8 8 0 0 1 0 12" />
              <path d="M12.5 3.5a12 12 0 0 1 0 17" />
              <path d="M4.5 8.5a4.5 4.5 0 0 1 0 7" />
            </svg>
          </div>

          {/* EMV chip */}
          <div
            aria-hidden="true"
            className="relative h-[18%] w-[14%] overflow-hidden rounded-[0.35rem] bg-gradient-to-br from-[#E9D9A4] via-[#C9AE68] to-[#A98F4C]"
          >
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/25" />
            <span className="absolute inset-y-0 left-1/3 w-px bg-black/25" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-black/25" />
          </div>

          {/* Footer: product label + asset-class marks */}
          <div className="flex items-end justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/85 sm:text-[11px] md:text-xs">
              Debit
            </span>
            <div className="flex items-center gap-[4%]">
              {/* Bitcoin */}
              <span className="flex aspect-square w-[13%] items-center justify-center rounded-full ring-[1.5px] ring-[#D60101]">
                <span className="text-[9px] font-bold leading-none text-[#D60101] sm:text-[11px] md:text-sm">
                  ₿
                </span>
              </span>
              {/* Candlesticks */}
              <span className="flex aspect-square w-[13%] items-center justify-center rounded-full ring-[1.5px] ring-[#D60101]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 14 14"
                  className="w-[58%] text-[#D60101]"
                  fill="currentColor"
                >
                  <rect x="2" y="4" width="2.4" height="6" rx="0.5" />
                  <rect x="2.8" y="2" width="0.8" height="10" />
                  <rect x="9.6" y="5.5" width="2.4" height="5" rx="0.5" />
                  <rect x="10.4" y="3.5" width="0.8" height="9" />
                  <rect x="5.8" y="3" width="2.4" height="7" rx="0.5" />
                  <rect x="6.6" y="1.5" width="0.8" height="10.5" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
