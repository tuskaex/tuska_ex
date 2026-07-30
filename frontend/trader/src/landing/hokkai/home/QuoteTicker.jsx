'use client'

// ============================================
// TUSKAEX - Quote Ticker — Cyber-Samurai
// Auto-scrolling market quotes, sits directly under the hero video
// ============================================

import React from 'react'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

// How many times liveChips is repeated inside the marquee track. Must stay
// EVEN — the keyframe translates the track by -50%, i.e. exactly half the
// copies, so an odd count would jump at the loop point.
const MARQUEE_COPIES = 4

const liveChips = [
  { label: 'EUR/USD', value: '1.0854', change: '+0.21%', positive: true },
  { label: 'XAU/USD', value: '2,034',  change: '+0.40%', positive: true },
  { label: 'BTC/USD', value: '43,215', change: '-0.72%', positive: false },
  { label: 'US30',    value: '38,654', change: '+0.32%', positive: true },
]

/**
 * Quote ticker band.
 *
 * This used to be overlaid on the hero video. It lives on its own band below
 * the video now, so the footage carries no content at all — the hero is
 * purely cinematic and every readable element starts here.
 *
 * Because the band is opaque, the chips no longer need the dark backing they
 * required over the video; a light wash reads better against it and gives
 * the chips an edge instead of hiding them dark-on-dark.
 */
export default function QuoteTicker() {
  return (
    <section
      className="relative overflow-hidden border-b border-white/5 py-3.5"
      style={{ background: 'rgba(5,7,10,0.55)', backdropFilter: 'blur(12px)' }}
      aria-label="Market quotes"
    >
      {/* Top neon hairline — continues the seam out of the hero's dark
          bottom stop so the two sections read as one transition. */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(225,29,72,0.3), transparent)' }}
      />

      {/* MARQUEE_COPIES copies of liveChips are rendered and the track is
          animated to translateX(-50%), so the second half lands exactly
          where the first started and the loop is seamless. 4 copies (not 2)
          because liveChips is short — 2 copies would be narrower than the
          container on desktop and leave a visible empty stretch.
          See .chip-marquee in hokkai.css for the width maths. */}
      <div className="chip-marquee">
        <div className="chip-marquee-track">
          {Array.from({ length: MARQUEE_COPIES }).flatMap((_, copy) =>
            liveChips.map((chip) => (
              <div
                key={`${copy}-${chip.label}`}
                /* aria-hidden on the duplicates: a screen reader should hear
                   the four quotes once, not four times over. */
                aria-hidden={copy > 0 ? 'true' : undefined}
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-4 py-2 rounded-lg border border-white/10 transition-all duration-300 hover:border-white/25"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-white text-xs font-mono font-bold tracking-wider">{chip.label}</span>
                <span className="text-slate-400 text-xs font-mono">{chip.value}</span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-mono font-semibold ${
                    chip.positive ? 'text-[#00d4aa]' : 'text-[#e11d48]'
                  }`}
                >
                  {chip.positive ? <FiTrendingUp size={9} /> : <FiTrendingDown size={9} />}
                  {chip.change}
                </span>
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  )
}
