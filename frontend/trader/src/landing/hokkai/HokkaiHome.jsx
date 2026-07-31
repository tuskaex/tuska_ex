'use client'

// ============================================
// TUSKAEX - Home Page — Cyber-Samurai
// ============================================

import React from 'react'
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
// Style layer for this landing only. Every rule inside is scoped under
// `.hk-landing` (applied on the root below) so the ported `.card`,
// `.btn-primary`, `.section-container` etc. can't leak out and restyle
// the trader dashboard, which defines its own versions of those names.
import './hokkai.css'
import AnimatedSection, { PageTransition } from './components/AnimatedSection'
import { Hanko } from './components/JapaneseMotifs'
import { stats } from './HomeData'

// Section components
import HeroSection from './home/HeroSection'
import QuoteTicker from './home/QuoteTicker'
import AboutSection from './home/AboutSection'
import WhySection from './home/WhySection'
import MarketsSection from './home/MarketsSection'
import PlatformSection from './home/PlatformSection'
import AccountsSection from './home/AccountsSection'
import ConditionsSection from './home/ConditionsSection'
import ToolsSection from './home/ToolsSection'
import EducationSection from './home/EducationSection'
import BottomSection from './home/BottomSection'

// Stat Counter
function StatCounter({ value, suffix, label, decimals }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 })
  return (
    <div ref={ref} className="text-center">
      <div
        className="text-3xl md:text-4xl font-bold mb-1"
        style={{
          fontFamily: "var(--font-michroma), Michroma, sans-serif",
          background: 'linear-gradient(135deg, #D60101 0%, #F14A4A 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 8px rgba(214, 1, 1,0.4))',
        }}
      >
        {inView
          ? <CountUp end={value} duration={2.5} decimals={decimals} suffix={suffix} />
          : <span>0{suffix}</span>
        }
      </div>
      <p className="text-slate-400 text-xs uppercase tracking-wider font-mono">{label}</p>
    </div>
  )
}

function Home() {
  return (
    <PageTransition>
      {/* `hk-landing` is the scope hook every rule in hokkai.css hangs
          off. Without it the ported page renders unstyled. */}
      <div className="hk-landing min-h-screen">

      {/* 1. Hero Section — video only, no overlaid content by design */}
      <HeroSection />

      {/* 2. Quote Ticker — was overlaid on the hero video; it sits under the
             video now so the footage plays clean. */}
      <QuoteTicker />

      {/* 3. Stats Bar — Glassmorphism */}
      <section
        className="relative py-10 border-y border-white/5 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)' }}
      >
        {/* Top neon line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(214, 1, 1,0.3), transparent)' }}
        />
        <div className="absolute inset-0 shoji-bg opacity-20 pointer-events-none" />
        {/* 籠目 — woven lattice, sits over the shoji grid to give the
            stats band a textile rather than a graph-paper texture. */}
        <div className="absolute inset-0 kagome-bg opacity-[0.55] pointer-events-none" />

        <div className="section-container relative z-10">
          {/* 印章 — the house seal. The hero is deliberately free of
              readable marks, so the brand stamp lands here instead, at
              the top of the first content band. */}
          <div className="mb-9 flex items-center justify-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#D60101]/50" />
            <Hanko char="牙" size={54} />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#D60101]/50" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <AnimatedSection key={stat.label} animation="slideUp" delay={i * 0.1}>
                <StatCounter {...stat} />
              </AnimatedSection>
            ))}
          </div>
        </div>

        {/* Bottom neon line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(214, 1, 1,0.3), transparent)' }}
        />
      </section>

      {/* 4. About */}
      <AboutSection />

      {/* 5. Why Choose */}
      <WhySection />

      {/* 6. Markets */}
      <MarketsSection />

      {/* 7. Platform */}
      <PlatformSection />

      {/* 8. Accounts */}
      <AccountsSection />

      {/* 9. Conditions */}
      <ConditionsSection />

      {/* 10. Tools */}
      <ToolsSection />

      {/* 11. Education */}
      <EducationSection />

      {/* 12. Bottom (Testimonials + FAQ + CTA) */}
      <BottomSection />

      </div>
    </PageTransition>
  )
}

export default Home
