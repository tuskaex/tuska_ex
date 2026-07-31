'use client'

// ============================================
// TUSKAEX — Japanese motif primitives 和柄
// ============================================
//
// Shared decorative pieces for the Cyber-Samurai landing. Everything
// here is presentational and aria-hidden: it carries no information a
// screen-reader user would lose.
//
// The styling lives in hokkai.css (`.hanko`, `.sakura-petal`,
// `.tategaki`, and the pattern backgrounds) so it stays scoped under
// `.hk-landing` and cannot leak into the trader dashboard.

import React from 'react'

/**
 * 印章 — hanko seal.
 *
 * A carved name-seal. 牙 (kiba, "tusk") is the house mark: it is the
 * literal meaning of the Tusk in TuskaEx, which is why it replaced the
 * 北海 ("Hokkai") kanji left behind by the previous brand.
 */
export function Hanko({ char = '牙', size = 64, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`hanko ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
    >
      {char}
    </span>
  )
}

/**
 * 桜吹雪 — drifting sakura petals.
 *
 * The petal table is a FIXED constant, never Math.random(). This
 * component renders during SSR, and randomised inline styles would
 * differ between the server HTML and the first client render —
 * React would flag a hydration mismatch and throw the markup away.
 * Hand-picked values also let the drift be tuned rather than hoped for.
 *
 * left: viewport-relative start column
 * size: petal edge in px — varied so the field reads as having depth
 * delay/duration: staggered so petals never fall in visible lockstep
 */
const PETALS = [
  { left: '4%', size: 10, delay: '0s', duration: '13s' },
  { left: '13%', size: 7, delay: '3.4s', duration: '16s' },
  { left: '24%', size: 12, delay: '1.2s', duration: '11.5s' },
  { left: '33%', size: 8, delay: '6.1s', duration: '15s' },
  { left: '45%', size: 9, delay: '2.3s', duration: '12.5s' },
  { left: '56%', size: 13, delay: '8.2s', duration: '17s' },
  { left: '65%', size: 7, delay: '4.7s', duration: '14s' },
  { left: '74%', size: 11, delay: '0.8s', duration: '12s' },
  { left: '84%', size: 8, delay: '5.5s', duration: '16.5s' },
  { left: '93%', size: 10, delay: '2.9s', duration: '13.5s' },
]

export function SakuraLayer({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`sakura-layer pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="sakura-petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  )
}

/**
 * 縦書き — vertical text rail.
 *
 * Sits against a section edge as a running label. Hidden below lg:
 * there is no horizontal room for a vertical rail on a phone, and
 * squeezing one in just steals width from the content.
 */
export function TategakiRail({ text, side = 'left', className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 lg:block ${
        side === 'left' ? 'left-5 xl:left-8' : 'right-5 xl:right-8'
      } ${className}`}
    >
      <span className="tategaki jp-kanji text-[11px] font-medium uppercase text-white/25">
        {text}
      </span>
    </div>
  )
}

/**
 * A kanji + romaji pair for section headers — the kanji large and
 * faint, the reading small beneath it. Gives each section a Japanese
 * anchor without turning the copy itself into a translation exercise.
 */
export function KanjiMark({ char, reading, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-col items-center leading-none ${className}`}
    >
      <span className="jp-kanji text-2xl text-[#D60101]/70">{char}</span>
      {reading && (
        <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
          {reading}
        </span>
      )}
    </span>
  )
}
