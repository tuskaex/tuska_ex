// ============================================
// HOKKAI MARKETS - Animated Section Wrapper
// Triggers fade/slide animations on scroll
// ============================================

import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

// Animation variants
const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },
}

/**
 * AnimatedSection - Wraps children with scroll-triggered animation
 * @param {string} animation - Animation type: fadeIn | slideUp | slideDown | slideLeft | slideRight | scaleIn | staggerContainer
 * @param {number} delay - Animation delay in seconds
 * @param {number} duration - Animation duration in seconds
 * @param {string} className - Additional CSS classes
 * @param {string} threshold - IntersectionObserver threshold (0-1)
 * @param {boolean} once - Whether to animate only once
 */
function AnimatedSection({
  children,
  animation = 'slideUp',
  delay = 0,
  duration = 0.6,
  className = '',
  threshold = 0.1,
  once = true,
  as = 'div',
}) {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce: once,
  })

  const MotionComponent = motion[as] || motion.div

  return (
    <MotionComponent
      ref={ref}
      variants={variants[animation]}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </MotionComponent>
  )
}

/**
 * StaggerContainer - Wraps children with staggered animation
 */
export function StaggerContainer({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView({
    threshold: 0.05,
    triggerOnce: true,
  })

  return (
    <motion.div
      ref={ref}
      variants={variants.staggerContainer}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggerItem - Individual item inside StaggerContainer
 */
export function StaggerItem({ children, className = '', animation = 'slideUp' }) {
  return (
    <motion.div
      variants={variants[animation]}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * PageTransition - Wraps page content with enter/exit animation
 */
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedSection
