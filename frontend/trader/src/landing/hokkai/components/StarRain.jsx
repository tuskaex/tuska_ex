'use client'

// ============================================
// TUSKAEX — 星の雨 (hoshi no ame) · star rain
// ============================================
//
// Replaces the 7.7 MB /tuskaex/hero.mp4 that used to fill the home hero.
// A canvas costs a few KB of JS and renders at any viewport size and
// pixel density, where the video was a fixed-resolution download every
// visitor paid for before seeing anything.
//
// Canvas rather than DOM nodes: this draws ~180 streaks plus a static
// starfield every frame. As absolutely-positioned elements that is
// ~250 nodes the compositor has to lay out 60 times a second, which
// stutters on mid-range phones. One canvas is one composite.
//
// Three things this deliberately handles, because a background
// animation that ignores them is a battery bug:
//   · prefers-reduced-motion — draws ONE static frame, no RAF loop.
//   · tab hidden            — cancels the loop entirely rather than
//                             animating into a compositor nobody sees.
//   · resize / DPR          — re-seeds to the new size so streaks stay
//                             sharp and never stretch.

import React, { useEffect, useRef } from 'react'

/* Streak density is per-area, not a flat count: a 4K monitor needs more
   than a phone to read as the same weather, and a phone must not pay for
   a monitor's worth. Clamped at both ends. */
const PER_MEGAPIXEL = 62
const MIN_STARS = 45
const MAX_STARS = 220

/* Brand red and two whites. Weighted so white dominates and the red
   reads as an accent — an all-red field looks like an alarm, not a sky. */
const PALETTE = [
  'rgba(255,255,255,',
  'rgba(255,255,255,',
  'rgba(255,225,225,',
  'rgba(214,1,1,',
  'rgba(241,74,74,',
]

function makeStar(w, h, rng, seededY) {
  const speed = 0.45 + rng() * 1.5
  return {
    x: rng() * w,
    // On first seed, spread stars through the full height so the effect
    // starts mid-storm instead of visibly filling from the top edge.
    y: seededY ? rng() * h : -rng() * h * 0.4,
    len: 12 + rng() * 46 * speed,
    speed: speed * 2.1,
    drift: -0.28 - rng() * 0.5, // slight lean, so it reads as rain not a grid
    alpha: 0.18 + rng() * 0.62,
    width: rng() < 0.14 ? 1.8 : 0.9,
    color: PALETTE[(rng() * PALETTE.length) | 0],
  }
}

export default function StarRain({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let stars = []
    let twinkles = []
    let raf = 0
    let w = 0
    let h = 0

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Math.random is fine here — this runs only in an effect, never
       during render, so there is no server/client HTML to disagree. */
    const rng = Math.random

    function seed() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap: 3x costs 2.25x the fill for no visible gain
      const rect = canvas.getBoundingClientRect()
      w = Math.max(rect.width, 1)
      h = Math.max(rect.height, 1)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.round(
        Math.min(MAX_STARS, Math.max(MIN_STARS, (w * h) / 1_000_000 * PER_MEGAPIXEL)),
      )
      stars = Array.from({ length: count }, () => makeStar(w, h, rng, true))

      // Static pinpricks behind the rain — depth, and something to look
      // at in the reduced-motion still.
      twinkles = Array.from({ length: Math.round(count * 0.7) }, () => ({
        x: rng() * w,
        y: rng() * h,
        r: rng() < 0.85 ? 0.7 : 1.3,
        a: 0.06 + rng() * 0.3,
      }))
    }

    function drawTwinkles() {
      for (const t of twinkles) {
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${t.a})`
        ctx.fill()
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h)
      drawTwinkles()

      ctx.lineCap = 'round'
      for (const s of stars) {
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + s.drift * s.len * 0.32, s.y - s.len)
        ctx.strokeStyle = `${s.color}${s.alpha})`
        ctx.lineWidth = s.width
        ctx.stroke()

        s.y += s.speed
        s.x += s.drift * 0.32

        // Recycle off the bottom rather than allocating a new object —
        // this loop runs 60x/sec and garbage here shows up as jank.
        if (s.y - s.len > h) {
          const fresh = makeStar(w, h, rng, false)
          Object.assign(s, fresh, { y: -fresh.len })
        }
      }
      raf = window.requestAnimationFrame(frame)
    }

    function start() {
      if (raf) return
      raf = window.requestAnimationFrame(frame)
    }
    function stop() {
      if (!raf) return
      window.cancelAnimationFrame(raf)
      raf = 0
    }

    function onResize() {
      stop()
      seed()
      if (reduceMotion) {
        ctx.clearRect(0, 0, w, h)
        drawTwinkles()
      } else if (!document.hidden) {
        start()
      }
    }

    function onVisibility() {
      if (reduceMotion) return
      if (document.hidden) stop()
      else start()
    }

    seed()
    if (reduceMotion) {
      // One frame, then nothing. A frozen storm mid-fall would read as a
      // broken render, so the still is the calm starfield only.
      ctx.clearRect(0, 0, w, h)
      drawTwinkles()
    } else {
      start()
    }

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
