// ============================================
// HOKKAI MARKETS - Why Section — Cyber-Samurai
// ============================================

import React from 'react'
import { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { whyFeatures } from '../HomeData'

function Kanji({ char, className = '' }) {
  return (
    <span
      className={`select-none pointer-events-none ${className}`}
      style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 900, lineHeight: 1 }}
      aria-hidden="true"
    >
      {char}
    </span>
  )
}

export default function WhySection() {
  return (
    <section
      className="section-padding relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #05070a 0%, #07090e 100%)' }}
    >
      {/* Background kanji */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="革新" className="absolute -left-6 top-1/2 -translate-y-1/2 text-[200px] text-white/[0.018] font-black" />
      </div>
      <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none" />

      <div className="section-container relative z-10">
        <SectionHeader
          badge="Why Choose Us"
          title="Why Choose Hokkai Markets"
          highlight="Hokkai Markets"
          subtitle="We combine institutional-grade technology with trader-friendly conditions to give you the edge in global markets."
        />

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {whyFeatures.map((f) => (
            <StaggerItem key={f.title}>
              <div className="card jp-card group h-full relative overflow-hidden">
                {/* Kanji watermark */}
                <div
                  className="absolute top-3 right-3 text-3xl text-white/[0.04] font-black pointer-events-none select-none"
                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                >
                  {f.kanji}
                </div>

                {/* Icon */}
                <div className={`feature-icon ${f.bg} ${f.color} mb-4`}>{f.icon}</div>

                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-[#f43f5e] transition-colors">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
