'use client'

import { useEffect, useRef } from 'react'

/**
 * Red-and-black ring that trails the pointer on the marketing site.
 *
 * SCOPE: mounted from (landing)/layout.tsx only. It is deliberately NOT
 * in the trader app — the terminal has chart drawing tools, price-line
 * drags and one-click order buttons, all of which depend on the real
 * cursor being exactly where the user thinks it is. A lagging decorative
 * ring there would be a usability regression, not a flourish.
 *
 * THE NATIVE CURSOR IS HIDDEN, WITH EXCEPTIONS. The arrow is suppressed
 * so only the ring shows; the hand returns over anything clickable and
 * the I-beam over text fields. That makes the pointer an affordance
 * again — if you see a hand, it responds to a click — rather than
 * something that appears over every pixel regardless.
 *
 * The suppression lives in styles/marketing.css under
 * `html:has(.tx-cursor-ring)`, keyed off this component's own markup,
 * and inside a `(pointer: fine) and (prefers-reduced-motion:
 * no-preference)` query that mirrors the early return below. If you
 * change the bail-out conditions here, change that query too — losing
 * the ring while the system cursor stays hidden leaves the user with no
 * pointer at all.
 *
 * The INTERACTIVE list below and the pointer selectors in that stylesheet
 * are two halves of one rule. Keep them in step, or the ring will open
 * on things the cursor does not acknowledge.
 *
 * PERFORMANCE: pointer position never enters React state. A mousemove
 * fires ~60-120x/sec and a setState per event would re-render the tree
 * that often. Position is written to refs and applied inside one rAF
 * loop via `transform`, which stays on the compositor. The only React
 * state is the hover flag, which changes rarely.
 */

/* Anything that should make the ring open up. Covers real interactive
   elements plus the two ways this codebase fakes them: role="button" and
   onClick on a plain div (which `[class*="cursor-pointer"]` catches). */
const INTERACTIVE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
  '[class*="cursor-pointer"]',
].join(',')

export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)

  // Target = true pointer position. Ring = eased follower.
  const target = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })
  const raf = useRef(0)
  const hovering = useRef(false)
  const visible = useRef(false)

  useEffect(() => {
    /* Coarse pointers have no hover and no cursor to decorate; on a phone
       this would render a ring stuck wherever the last tap landed. Also
       respect reduced-motion — the whole effect is trailing motion. */
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return

    const ringEl = ringRef.current
    const dotEl = dotRef.current
    if (!ringEl || !dotEl) return

    function show() {
      if (visible.current) return
      visible.current = true
      ringEl!.style.opacity = '1'
      dotEl!.style.opacity = '1'
    }
    function hide() {
      visible.current = false
      ringEl!.style.opacity = '0'
      dotEl!.style.opacity = '0'
    }

    function onMove(e: MouseEvent) {
      target.current.x = e.clientX
      target.current.y = e.clientY
      show()

      /* `closest()` on the event target, not elementFromPoint: it walks
         up from the actual node under the pointer, so a <span> inside a
         <button> still counts as the button. */
      const el = e.target as Element | null
      const isInteractive = !!(el && typeof el.closest === 'function' && el.closest(INTERACTIVE))
      if (isInteractive !== hovering.current) {
        hovering.current = isInteractive
        ringEl!.dataset.hover = isInteractive ? 'true' : 'false'
      }
    }

    function onDown() { ringEl!.dataset.down = 'true' }
    function onUp() { ringEl!.dataset.down = 'false' }

    function frame() {
      /* Lerp toward the pointer. Raised from 0.18 to 0.3 when the system
         arrow was hidden: the ring stopped being decoration over a real
         cursor and became the cursor, and at 0.18 it visibly trailed
         behind where the user was actually clicking. The dot is still
         pinned exactly, so precision never depends on this easing. */
      ring.current.x += (target.current.x - ring.current.x) * 0.3
      ring.current.y += (target.current.y - ring.current.y) * 0.3

      ringEl!.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0) translate(-50%, -50%)`
      dotEl!.style.transform = `translate3d(${target.current.x}px, ${target.current.y}px, 0) translate(-50%, -50%)`
      raf.current = window.requestAnimationFrame(frame)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown, { passive: true })
    window.addEventListener('mouseup', onUp, { passive: true })
    document.addEventListener('mouseleave', hide)
    document.addEventListener('mouseenter', show)
    raf.current = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(raf.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', hide)
      document.removeEventListener('mouseenter', show)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="tx-cursor-ring" aria-hidden="true" data-hover="false" data-down="false" />
      <div ref={dotRef} className="tx-cursor-dot" aria-hidden="true" />
    </>
  )
}
