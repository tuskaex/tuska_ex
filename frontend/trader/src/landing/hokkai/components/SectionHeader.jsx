'use client'

// ============================================
// TUSKAEX - Section Header Component
// Cyber-Samurai: Michroma futuristic headings
// ============================================

import React from 'react'
import AnimatedSection from './AnimatedSection'
import { KanjiMark } from './JapaneseMotifs'

/**
 * `kanji` / `reading` are optional. Each section already paints its own
 * kanji as a background watermark, but that runs at ~1.8% opacity — it
 * is texture, not something you can actually read. Passing the SAME
 * character here surfaces it legibly above the badge, so the section
 * gets a Japanese anchor without introducing a second, unrelated word.
 */
function SectionHeader({
  badge,
  title,
  highlight,
  subtitle,
  kanji,
  reading,
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

      {/* Kanji mark */}
      {kanji && (
        <AnimatedSection animation="fadeIn" delay={0}>
          <div className={`mb-4 flex ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
            <KanjiMark char={kanji} reading={reading} />
          </div>
        </AnimatedSection>
      )}

      {/* Badge */}
      {badge && (
        <AnimatedSection animation="slideDown" delay={0}>
          <div className={`inline-flex items-center gap-2 mb-5 ${align === 'center' ? 'mx-auto' : ''}`}>
            <div className="w-5 h-px bg-[#D60101]" />
            <span className="text-[#D60101] text-xs font-semibold uppercase tracking-[0.2em] font-mono">{badge}</span>
            <div className="w-5 h-px bg-[#D60101]" />
          </div>
        </AnimatedSection>
      )}

      {/* Title — Michroma futuristic font */}
      <AnimatedSection animation="slideUp" delay={0.1}>
        <h2
          className="section-title mb-4"
          style={{ fontFamily: "var(--font-michroma), Michroma, sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {renderTitle()}
        </h2>
      </AnimatedSection>

      {/* Neon divider */}
      <AnimatedSection animation="scaleIn" delay={0.2}>
        <div
          className={`w-14 h-0.5 mb-5 rounded-full ${align === 'center' ? 'mx-auto' : ''}`}
          style={{ background: 'linear-gradient(90deg, #D60101, #F14A4A)', boxShadow: '0 0 8px rgba(214, 1, 1,0.5)' }}
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
