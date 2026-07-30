'use client'

// ============================================
// TUSKAEX - Hero Section — Cyber-Samurai
// Cinematic: video + glow + scan lines + data chips
// ============================================

import React from 'react'
import { motion } from 'framer-motion'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

// How many times liveChips is repeated inside the marquee track. Must stay
// EVEN — the keyframe translates the track by -50%, i.e. exactly half the
// copies, so an odd count would jump at the loop point.
const MARQUEE_COPIES = 4

// Live data chips shown below the CTA
const liveChips = [
  { label: 'EUR/USD', value: '1.0854', change: '+0.21%', positive: true },
  { label: 'XAU/USD', value: '2,034',  change: '+0.40%', positive: true },
  { label: 'BTC/USD', value: '43,215', change: '-0.72%', positive: false },
  { label: 'US30',    value: '38,654', change: '+0.32%', positive: true },
]


export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── Background Video ── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/tuskaex/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* ── Multi-layer Cyber Gradient Overlay ──
          Lightened so the background video actually reads through it; it
          was 0.55 / 0.65 / 0.92 black, which flattened the footage into a
          dark smear.

          The stops are NOT uniform on purpose:
          • top stays the lightest — nothing sits there but the video, and
            the navbar is a solid pill with its own background.
          • the middle is where the quote chips ride, so it keeps enough
            density for white text to stay legible over the bright lantern
            highlights in the footage.
          • the bottom stays heaviest. That is a seam, not decoration —
            the next section is near-black, and fading out of it here is
            what stops a visible horizontal band at the hero's edge. Do
            not flatten this stop to match the others. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(5,7,10,0.26) 0%,
              rgba(1,2,3,0.40) 55%,
              rgba(1,2,3,0.80) 100%
            )
          `,
        }}
      />

      {/* ── Crimson Glow Halo (behind content) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 55%,
              rgba(225,29,72,0.13) 0%,
              transparent 70%
            )
          `,
        }}
      />

      {/* ── Scan-line Overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
        }}
      />

      {/* ── Subtle Grid ── (dialled back with the overlay above: at 25% it
          read as haze over the now-visible footage rather than as a grid) */}
      <div className="absolute inset-0 grid-bg opacity-[0.12] pointer-events-none" />

      {/* ── Side Accent Lines ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(225,29,72,0.35), transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(225,29,72,0.15), transparent)' }}
      />

      {/* ── Decorative corner brackets ── */}
      {/* Top-left */}
      <div className="absolute top-24 left-6 md:left-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-t border-l border-[#e11d48]/60" />
      </div>
      {/* Top-right */}
      <div className="absolute top-24 right-6 md:right-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-t border-r border-[#e11d48]/60" />
      </div>
      {/* Bottom-left */}
      <div className="absolute bottom-24 left-6 md:left-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-b border-l border-[#e11d48]/60" />
      </div>
      {/* Bottom-right */}
      <div className="absolute bottom-24 right-6 md:right-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-b border-r border-[#e11d48]/60" />
      </div>

      {/* ── Decorative Kanji watermark ── */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 text-[220px] font-black pointer-events-none select-none hidden xl:block"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          color: 'rgba(255,255,255,0.018)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        北海
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto w-full">

        {/* Live Data Chips — auto-scrolling marquee.
            MARQUEE_COPIES copies of liveChips are rendered and the track is
            animated to translateX(-50%), so the second half lands exactly
            where the first started and the loop is seamless. 4 copies (not
            2) because liveChips is short — 2 copies would be narrower than
            the container on desktop and leave a visible empty stretch.
            See .chip-marquee in hokkai.css for the width maths. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="chip-marquee"
        >
          <div className="chip-marquee-track">
            {Array.from({ length: MARQUEE_COPIES }).flatMap((_, copy) =>
              liveChips.map((chip) => (
                <div
                  key={`${copy}-${chip.label}`}
                  /* aria-hidden on the duplicates: a screen reader should hear
                     the four quotes once, not four times over. */
                  aria-hidden={copy > 0 ? 'true' : undefined}
                  className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-4 py-2.5 rounded-lg border border-white/10 transition-all duration-300 hover:border-white/25"
                  /* Dark fill, not the old rgba(255,255,255,0.04). A white
                     wash cannot carry white text — it only worked while the
                     overlay above was near-opaque. Now that the footage
                     shows through, the chips need their own dark backing or
                     the quotes wash out over the lit lanterns. */
                  style={{ background: 'rgba(5,7,10,0.55)', backdropFilter: 'blur(10px)' }}
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
        </motion.div>
      </div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-mono">Scroll</span>
        <div
          className="w-px h-10"
          style={{ background: 'linear-gradient(180deg, rgba(225,29,72,0.6), transparent)' }}
        />
      </motion.div>

    </section>
  )
}
