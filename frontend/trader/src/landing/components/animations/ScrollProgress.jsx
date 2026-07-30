
import { motion, useScroll } from 'framer-motion'

/**
 * Fixed 3px scroll-position bar across the top of the marketing pages.
 *
 * This carries more weight than it looks like it does: the hokkai landing
 * hides the native window scrollbar (see hokkai.css), so on that page this
 * is the ONLY indication of how far down the document you are. Removing it
 * would leave a very long page with no position feedback at all.
 *
 * The gradient was #1A56FF → #7B2FFF, a blue/purple left over from the
 * legacy port — nothing else on a TuskaEx surface is blue, so it read as
 * a stray. Now the brand crimson.
 */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        transformOrigin: 'left',
        height: 3,
        background: 'linear-gradient(to right, #e11d48, #f43f5e)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
      }}
    />
  )
}

export default ScrollProgress
