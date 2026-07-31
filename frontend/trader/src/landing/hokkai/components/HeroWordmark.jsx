'use client'

// ============================================
// TUSKAEX — animated hero wordmark
// ============================================
//
// Letter-by-letter entrance for the hero. Split as TUSKA + EX so the
// colouring matches the actual logo lockup, where "TUSKA" is dark/white
// and "EX" is the brand red — the same split the .png uses.
//
// Rendered as text rather than the logo image on purpose: the image is a
// fixed-size raster that cannot be animated per glyph, and text stays
// selectable, translatable and legible to a screen reader. The visible
// letters are aria-hidden and a single sr-only "TuskaEx" carries the
// name, so assistive tech reads the word once rather than spelling it.

import React from 'react'
import { motion } from 'framer-motion'

const WORD = [
  { ch: 'T', accent: false },
  { ch: 'U', accent: false },
  { ch: 'S', accent: false },
  { ch: 'K', accent: false },
  { ch: 'A', accent: false },
  { ch: 'E', accent: true },
  { ch: 'X', accent: true },
]

/* Stagger is on the container so the children need no per-index delay
   maths. delayChildren lets the star rain establish first — the wordmark
   landing into an already-falling sky reads better than both starting
   together. */
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.075, delayChildren: 0.35 },
  },
}

const letter = {
  hidden: { opacity: 0, y: 44, rotateX: -55, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 140, damping: 16, mass: 0.7 },
  },
}

const tagline = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { delay: 1.05, duration: 0.7, ease: 'easeOut' } },
}

const rule = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { delay: 0.95, duration: 0.8, ease: 'easeOut' } },
}

export default function HeroWordmark() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 flex flex-col items-center text-center px-6"
    >
      <span className="sr-only">TuskaEx</span>

      <div
        aria-hidden="true"
        className="flex items-baseline justify-center"
        style={{ perspective: '800px' }}
      >
        {WORD.map(({ ch, accent }, i) => (
          <motion.span
            key={i}
            variants={letter}
            className={`inline-block leading-none ${accent ? 'text-[#D60101]' : 'text-white'}`}
            style={{
              fontFamily: 'var(--font-michroma), Michroma, sans-serif',
              fontSize: 'clamp(2.6rem, 11vw, 9rem)',
              letterSpacing: '0.06em',
              textShadow: accent
                ? '0 0 28px rgba(214,1,1,0.55), 0 0 70px rgba(214,1,1,0.28)'
                : '0 0 26px rgba(255,255,255,0.22)',
            }}
          >
            {ch}
          </motion.span>
        ))}
      </div>

      {/* Hairline under the mark, drawn outward from the centre */}
      <motion.span
        aria-hidden="true"
        variants={rule}
        style={{ originX: 0.5 }}
        className="mt-7 block h-px w-40 bg-gradient-to-r from-transparent via-[#D60101] to-transparent sm:w-64"
      />

      <motion.p
        variants={tagline}
        className="mt-6 max-w-xl text-sm uppercase tracking-[0.34em] text-white/60 sm:text-base"
      >
        <span className="jp-kanji mr-3 text-[#F14A4A]/80">牙</span>
        Trade the world&apos;s markets
      </motion.p>
    </motion.div>
  )
}
