'use client'

// ============================================
// TUSKAEX - Hero Section — Cyber-Samurai
// Star rain + animated wordmark.
// ============================================
//
// HISTORY, because this reverses a documented decision:
//
// This section used to be a 7.7 MB background video and was marked
// "deliberately CONTENT-FREE" — the quote chips and scroll cue had been
// pulled off the footage so it played clean, and the note said that
// adding a headline here would be reversing that.
//
// It is now reversed, deliberately. The video is gone (replaced by the
// StarRain canvas, which costs a few KB instead of 7.7 MB and renders at
// any size), and with no footage to obscure there is nothing left for a
// headline to compete with. The wordmark IS the hero now.
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
          A flat, near-black canvas for the rain to fall through. This
          replaces the <video>: the sky is painted, not filmed. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 0%, #0b1020 0%, #05070d 45%, #010203 100%)',
        }}
      />

      {/* ── 星の雨 — continuous star rain ── */}
      <StarRain />

      {/* ── Depth / legibility overlay ──
          The stops are NOT uniform on purpose:
          • top stays lightest — the navbar is a solid pill with its own
            background and needs no help.
          • the middle is now doing real work: the wordmark sits there, so
            this stop is what keeps it legible against a bright streak
            passing behind it. It was 0.26 when nothing rode here.
          • the bottom stays heaviest. That is a seam, not decoration —
            the quote ticker below opens on a near-black band, and fading
            into it here is what stops a visible horizontal edge at the
            hero's base. Do not flatten this stop to match the others. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(5,7,10,0.10) 0%,
              rgba(1,2,3,0.42) 55%,
              rgba(1,2,3,0.72) 100%
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
