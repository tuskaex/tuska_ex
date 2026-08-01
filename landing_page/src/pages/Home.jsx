// ============================================
// HOKKAI MARKETS - Home Page — Cyber-Samurai
// ============================================

import React from 'react'
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import AnimatedSection, { PageTransition } from '../components/AnimatedSection'
import MarketTicker from '../components/MarketTicker'
import { stats } from './HomeData'

// Section components
import HeroSection from './home/HeroSection'
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
          fontFamily: "'Michroma', sans-serif",
          background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 8px rgba(225,29,72,0.4))',
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

      {/* Market Ticker */}
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Stats Bar — Glassmorphism */}
      <section
        className="relative py-10 border-y border-white/5 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)' }}
      >
        {/* Top neon line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(225,29,72,0.3), transparent)' }}
        />
        <div className="absolute inset-0 shoji-bg opacity-20 pointer-events-none" />

        <div className="section-container relative z-10">
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
          style={{ background: 'linear-gradient(90deg, transparent, rgba(225,29,72,0.3), transparent)' }}
        />
      </section>

      {/* 3. About */}
      <AboutSection />

      {/* 4. Why Choose */}
      <WhySection />

      {/* 5. Markets */}
      <MarketsSection />

      {/* 6. Platform */}
      <PlatformSection />

      {/* 7. Accounts */}
      <AccountsSection />

      {/* 8. Conditions */}
      <ConditionsSection />

      {/* 9. Tools */}
      <ToolsSection />

      {/* 10. Education */}
      <EducationSection />

      {/* 11. Bottom (Testimonials + FAQ + CTA) */}
      <BottomSection />

    </PageTransition>
  )
}

export default Home
