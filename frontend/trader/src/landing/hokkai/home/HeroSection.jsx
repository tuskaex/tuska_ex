'use client'

// ============================================
// TUSKAEX - Hero Section — Cyber-Samurai
// Painted sky -> star rain -> footage -> wordmark.
// ============================================
//
// LAYER ORDER IS THE WHOLE DESIGN. Back to front:
//   1. night-sky gradient base  — fallback while the video streams
//   2. hero.mp4                 — full opacity, no blend
//   3. StarRain canvas          — transparent, so it costs the video
//                                 nothing while staying fully visible
//   4. depth / legibility wash  — light; just enough to hold the type
//   5. HeroWordmark (z-10)      — animated TUSKAEX, always on top
//
// The rain sits ABOVE the video, and that ordering is the fix, not an
// accident. The reverse (rain behind, video blended at 55% so the rain
// showed through) was tried first and produced a washed-out haze where
// the footage should be. Transparent-canvas-over-opaque-video shows
// both at full strength; blending shows neither properly.
//
// HISTORY, because this section has now reversed a documented decision
// twice and the next person deserves the trail:
//
// It began as a bare 7.7 MB background video marked "deliberately
// CONTENT-FREE" — chips and scroll cue had been pulled off the footage
// so it played clean, and the note warned that adding a headline would
// be reversing that.
//
// Then the video was removed entirely for the star rain, and the
// wordmark added, which reversed it.
//
// Now the footage is back, composited over the rain rather than instead
// of it. So the "content-free" rule stays reversed: the wordmark is the
// hero, and the rain plus footage are its weather.
//
// The quote ticker still lives in home/QuoteTicker.jsx as its own band
// below — that half of the original decision stands. Do not move it back
// on top of this section.

import React from 'react'
import StarRain from '../components/StarRain'
import HeroWordmark from '../components/HeroWordmark'
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

      {/* ── Night sky base ──
          Now only a fallback: it is what shows while the 7.7 MB video is
          still streaming, and behind the letterboxed edges on extreme
          aspect ratios. The footage covers it once playing. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 0%, #0b1020 0%, #05070d 45%, #010203 100%)',
        }}
      />

      {/* ── Footage ──
          Plays at full opacity with NO blend mode.

          It used to run at `mix-blend-mode: screen` and 0.55 so the star
          rain behind it could show through the dark parts. That did keep
          both visible, but screen only ever lightens — it washed the
          footage into a flat red haze instead of showing it, and the
          lanterns barely read.

          The fix was not to push the opacity of a blended layer, it was
          to stop stacking them in that order. The rain now draws ON TOP
          (see below), so the video can simply be itself: real colours,
          full strength, nothing subtracted.

          preload="metadata" because this file is 7.7 MB. Do not block
          first paint on it — the browser takes the header, paints the
          sky and rain immediately, and streams the rest. */}
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        src="/tuskaex/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

      {/* ── 星の雨 — continuous star rain, now IN FRONT of the footage ──
          Moved above the video deliberately. The canvas is transparent
          except for the streaks, so putting it here costs the footage
          nothing while the rain stays fully visible at all times —
          which is what the earlier arrangement could only fake by
          dimming the video to 55%.

          It also simply reads better: rain falling in front of a lit
          street at night is what rain does. */}
      <StarRain />

      {/* ── Depth / legibility overlay ──
          Lightened across the board now that the footage plays at full
          strength — the mid stop was 0.42, which was the other half of
          why the video looked murky. It is now 0.26: still enough of a
          scrim to hold the wordmark, but the lanterns come through.

          The stops are NOT uniform on purpose:
          • top stays lightest — the navbar is a solid pill with its own
            background and needs no help.
          • the middle carries the wordmark, so this stop is what keeps
            white type legible when a bright lantern passes behind it.
            Do not take it to zero.
          • the bottom stays heaviest. That is a seam, not decoration —
            the quote ticker below opens on a near-black band, and fading
            into it here is what stops a visible horizontal edge at the
            hero's base. Do not flatten this stop to match the others. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(5,7,10,0.06) 0%,
              rgba(1,2,3,0.26) 55%,
              rgba(1,2,3,0.68) 100%
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

      {/* ── The wordmark ──
          Centred over the rain. `min-h-screen` is on the section and the
          negative top margin pulls it under the navbar, so the padding
          here re-centres the mark in the visible area rather than in the
          section box — without it the wordmark sits ~40px high. */}
      <div className="relative z-10 flex min-h-screen items-center justify-center pt-[76px] md:pt-[84px]">
        <HeroWordmark />
      </div>

      {/* ── 桜吹雪 — drifting petals ──
          Kept alongside the star rain: petals drift and sway on their own
          timing while the streaks fall fast and straight, so the two read
          as separate layers of weather rather than one confused effect. */}
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
