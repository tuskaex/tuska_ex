// ============================================
// HOKKAI MARKETS - Section Header Component
// Cyber-Samurai: Michroma futuristic headings
// ============================================

import React from 'react'
import AnimatedSection from './AnimatedSection'

function SectionHeader({
  badge,
  title,
  highlight,
  subtitle,
  align = 'center',
  className = '',
}) {
  const renderTitle = () => {
    if (!highlight) return title
    const parts = title.split(highlight)
    return (
      <>
        {parts[0]}
        <span className="text-red-gradient">{highlight}</span>
        {parts[1]}
      </>
    )
  }

  return (
    <div className={`${align === 'center' ? 'text-center' : 'text-left'} ${className}`}>

      {/* Badge */}
      {badge && (
        <AnimatedSection animation="slideDown" delay={0}>
          <div className={`inline-flex items-center gap-2 mb-5 ${align === 'center' ? 'mx-auto' : ''}`}>
            <div className="w-5 h-px bg-[#e11d48]" />
            <span className="text-[#e11d48] text-xs font-semibold uppercase tracking-[0.2em] font-mono">{badge}</span>
            <div className="w-5 h-px bg-[#e11d48]" />
          </div>
        </AnimatedSection>
      )}

      {/* Title — Michroma futuristic font */}
      <AnimatedSection animation="slideUp" delay={0.1}>
        <h2
          className="section-title mb-4"
          style={{ fontFamily: "'Michroma', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {renderTitle()}
        </h2>
      </AnimatedSection>

      {/* Neon divider */}
      <AnimatedSection animation="scaleIn" delay={0.2}>
        <div
          className={`w-14 h-0.5 mb-5 rounded-full ${align === 'center' ? 'mx-auto' : ''}`}
          style={{ background: 'linear-gradient(90deg, #e11d48, #f43f5e)', boxShadow: '0 0 8px rgba(225,29,72,0.5)' }}
        />
      </AnimatedSection>

      {/* Subtitle */}
      {subtitle && (
        <AnimatedSection animation="fadeIn" delay={0.3}>
          <p className={`section-subtitle max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>
            {subtitle}
          </p>
        </AnimatedSection>
      )}
    </div>
  )
}

export default SectionHeader
