'use client'

// ============================================
// TUSKAEX - Hero Section — Cyber-Samurai
// Cinematic: video + glow + scan lines. Deliberately CONTENT-FREE.
// ============================================
//
// Nothing readable belongs in here. The quote chips and the scroll cue both
// used to be overlaid on the footage; they were pulled out so the video
// plays clean. The quotes now live in home/QuoteTicker.jsx, rendered as its
// own band immediately below this section. If you are about to add a
// headline, CTA or badge here, that is the decision being reversed — put it
// in a section under the video instead.

import React from 'react'
import { SakuraLayer, TategakiRail } from '../components/JapaneseMotifs'

export default function HeroSection() {
  return (
    /* The negative top margin slides this section up UNDER the sticky navbar
       so the video starts at the very top of the viewport and fills it.
       Without it the navbar occupies flow space above the hero, and the page
       surface showed as a band over the video plus slivers either side of the
       navbar's rounded pill and in its 12px side gutters.

       The offsets are the navbar's total height and must track it: `top-3`
       (12px) + `h-16` (64px) = 76px, and at md `top-4` (16px) + 68px = 84px.
       If the navbar's height or top offset changes in Navbar.tsx, these two
       numbers change with it. The navbar keeps z-50 so it still floats over
       the footage rather than being covered by it. */
    <section className="relative min-h-screen overflow-hidden -mt-[76px] md:-mt-[84px]">

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
          Lightened twice now: 0.55/0.65/0.92 → 0.26/0.40/0.80 → the values
          below. The footage is the point of the hero, so the overlay only
          has to earn its keep where text actually sits.

          The stops are NOT uniform on purpose:
          • top stays the lightest — nothing sits there but the video, and
            the navbar is a solid pill with its own background.
          • the middle only bridges the two ends. No text rides anywhere in
            this section any more, so no stop is carrying legibility.
          • the bottom stays heaviest. That is a seam, not decoration — the
            quote ticker below opens on a near-black band, and fading into
            it here is what stops a visible horizontal edge at the hero's
            base. Do not flatten this stop to match the others. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(5,7,10,0.14) 0%,
              rgba(1,2,3,0.26) 55%,
              rgba(1,2,3,0.70) 100%
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
              rgba(214, 1, 1,0.13) 0%,
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
        style={{ background: 'linear-gradient(180deg, transparent, rgba(214, 1, 1,0.35), transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(214, 1, 1,0.15), transparent)' }}
      />

      {/* ── Decorative corner brackets ── */}
      {/* Top-left */}
      <div className="absolute top-24 left-6 md:left-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-t border-l border-[#D60101]/60" />
      </div>
      {/* Top-right */}
      <div className="absolute top-24 right-6 md:right-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-t border-r border-[#D60101]/60" />
      </div>
      {/* Bottom-left */}
      <div className="absolute bottom-24 left-6 md:left-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-b border-l border-[#D60101]/60" />
      </div>
      {/* Bottom-right */}
      <div className="absolute bottom-24 right-6 md:right-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-b border-r border-[#D60101]/60" />
      </div>

      {/* ── Decorative Kanji watermark ──
          牙 (kiba) — "tusk". The house mark, and a literal reading of
          the Tusk in TuskaEx. It replaced 北海 ("Hokkai"), which was
          the PREVIOUS brand's name sitting in 220px type on our own
          home page — invisible to a text search for "Hokkai" because
          it was written in kanji. */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 text-[220px] font-black pointer-events-none select-none hidden xl:block"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          color: 'rgba(255,255,255,0.018)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        牙
      </div>

      {/* ── 桜吹雪 — drifting petals ──
          Pure atmosphere. This section is deliberately content-free
          (see the header note), so everything added here has to be
          non-readable: petals, patterns and vertical rails qualify,
          a headline or badge would not. */}
      <SakuraLayer />

      {/* ── 縦書き rails ── */}
      <TategakiRail text="外国為替取引" side="left" />
      <TategakiRail text="タスカEX" side="right" />

      {/* ── 青海波 — wave band along the hero's base ──
          Masked to fade upward so the pattern emerges out of the
          existing dark seam rather than starting on a hard edge. */}
      <div
        aria-hidden="true"
        className="seigaiha-bg pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-70"
        style={{
          WebkitMaskImage: 'linear-gradient(to top, #000 0%, transparent 100%)',
          maskImage: 'linear-gradient(to top, #000 0%, transparent 100%)',
        }}
      />

    </section>
  )
}
