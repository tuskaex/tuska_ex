// ============================================
// HOKKAI MARKETS - Platform Section — Cyber-Samurai
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { platforms, platformFeatures } from '../HomeData'

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

export default function PlatformSection() {
  return (
    <section
      className="section-padding relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #05070a 0%, #07090e 100%)' }}
    >
      <div className="absolute inset-0 dot-bg opacity-25 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="技術" className="absolute -left-4 top-10 text-[180px] text-white/[0.018] font-black" />
      </div>

      <div className="section-container relative z-10">
        <SectionHeader
          badge="Platform"
          title="Next-Generation Trading Platform"
          highlight="Next-Generation"
          subtitle="Hokkai Markets offers a next-generation trading environment designed for performance and reliability."
        />

        {/* 3 Platform Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14">
          {platforms.map((p) => (
            <StaggerItem key={p.name}>
              <div className={`card jp-card group h-full border ${p.border} hover:shadow-lg`}>
                <div className={`feature-icon ${p.bg} ${p.color} mb-4`}>{p.icon}</div>
                <span className={`badge ${p.bg} ${p.color} text-xs mb-3 inline-block`}>{p.tag}</span>
                <h3 className="text-white font-semibold text-lg mb-3 group-hover:text-[#f43f5e] transition-colors">{p.name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Platform Features */}
        <AnimatedSection animation="slideUp" delay={0.3}>
          <div
            className="mt-12 p-6 md:p-8 rounded-2xl border border-white/8 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}
          >
            {/* Kanji watermark */}
            <div
              className="absolute top-3 right-4 text-[60px] text-white/[0.03] font-black pointer-events-none select-none"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              機能
            </div>

            <h4
              className="text-white font-semibold text-center mb-6 text-lg uppercase tracking-wider"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              Platform Features
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platformFeatures.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:border-[#e11d48]/20 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(225,29,72,0.15)' }}
                  >
                    <FiCheck size={11} className="text-[#e11d48]" />
                  </div>
                  <span className="text-slate-300 text-sm">{f}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link to="/platforms" className="btn-primary gap-2">Explore Platform <FiArrowRight size={16} /></Link>
              <Link to="/accounts" className="btn-outline gap-2">Try Demo</Link>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
