// ============================================
// HOKKAI MARKETS - About Section — Cyber-Samurai
// Dojo-style grid: katana art left, structured text right
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiZap, FiTarget } from 'react-icons/fi'
import AnimatedSection from '../../components/AnimatedSection'

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

const pillars = [
  { icon: <FiShield size={14} />, label: 'Transparency', kanji: '透明' },
  { icon: <FiZap size={14} />,    label: 'Innovation',   kanji: '革新' },
  { icon: <FiTarget size={14} />, label: 'Integrity',    kanji: '誠実' },
]

export default function AboutSection() {
  return (
    <section
      className="section-padding relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #07090e 0%, #05070a 100%)' }}
    >
      {/* Background kanji watermark */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="信頼" className="absolute -right-6 top-1/2 -translate-y-1/2 text-[200px] text-white/[0.018] font-black" />
      </div>

      {/* Left accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(225,29,72,0.2), transparent)' }}
      />

      <div className="section-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT: Dojo-style imagery panel ── */}
          <AnimatedSection animation="slideLeft">
            <div className="relative">
              {/* Main imagery container */}
              <div
                className="relative rounded-2xl overflow-hidden aspect-square w-full max-w-md mx-auto border border-white/8"
                style={{
                  backgroundImage: 'url(/card_image_1.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Dark overlay to keep text readable */}
                <div className="absolute inset-0 bg-black/25" />

                {/* Inner grid pattern */}
                <div className="absolute inset-0 shoji-bg opacity-30" />

                {/* Central kanji watermark */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Kanji char="北海" className="text-[130px] text-white/[0.06] font-black" />
                </div>

                {/* Katana SVG art — monochromatic */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg viewBox="0 0 200 200" className="w-52 h-52 opacity-[0.12]" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="100" y1="18" x2="100" y2="158" stroke="white" strokeWidth="1.5" />
                    <line x1="100" y1="18" x2="103" y2="155" stroke="white" strokeWidth="0.6" opacity="0.6" />
                    <ellipse cx="100" cy="155" rx="18" ry="5" stroke="white" strokeWidth="1.5" />
                    <rect x="96" y="160" width="8" height="28" rx="2" stroke="white" strokeWidth="1.5" />
                    <line x1="96" y1="167" x2="104" y2="167" stroke="white" strokeWidth="0.8" />
                    <line x1="96" y1="174" x2="104" y2="174" stroke="white" strokeWidth="0.8" />
                    <line x1="96" y1="181" x2="104" y2="181" stroke="white" strokeWidth="0.8" />
                    <circle cx="100" cy="100" r="58" stroke="white" strokeWidth="0.4" opacity="0.2" />
                    <circle cx="100" cy="100" r="78" stroke="white" strokeWidth="0.3" opacity="0.1" />
                    <circle cx="100" cy="100" r="95" stroke="white" strokeWidth="0.2" opacity="0.06" />
                  </svg>
                </div>

                {/* Neon corner accents */}
                <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-[#e11d48]/50" />
                <div className="absolute top-4 right-4 w-5 h-5 border-t border-r border-[#e11d48]/50" />
                <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l border-[#e11d48]/50" />
                <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-[#e11d48]/50" />

                {/* Floating glass chips */}
                <div
                  className="absolute top-6 left-6 rounded-xl p-3 border border-[#e11d48]/20"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}
                >
                  <div className="text-[#e11d48] text-xs font-semibold font-mono uppercase tracking-wider">Our Vision</div>
                  <div className="text-white text-xs mt-1">Globally trusted partner</div>
                </div>

                <div
                  className="absolute bottom-6 right-6 rounded-xl p-3 border border-[#00d4aa]/20"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}
                >
                  <div className="text-[#00d4aa] text-xs font-semibold font-mono uppercase tracking-wider">Our Mission</div>
                  <div className="text-white text-xs mt-1">Empower traders worldwide</div>
                </div>

                <div
                  className="absolute bottom-6 left-6 rounded-xl p-3 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
                >
                  <div className="text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider font-mono">Core Values</div>
                  {['Transparency', 'Innovation', 'Integrity', 'Client-Centric'].map(val => (
                    <div key={val} className="text-white text-xs flex items-center gap-1.5 mb-0.5">
                      <span
                        className="w-1 h-1 rounded-full bg-[#e11d48] flex-shrink-0"
                        style={{ boxShadow: '0 0 4px rgba(225,29,72,0.7)' }}
                      />
                      {val}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mon decoration */}
              <div
                className="absolute -top-3 -right-3 w-12 h-12 rounded-full border border-[#e11d48]/25 flex items-center justify-center"
                style={{ background: '#05070a' }}
              >
                <div className="w-8 h-8 rounded-full border border-[#e11d48]/15 flex items-center justify-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: 'rgba(225,29,72,0.3)', boxShadow: '0 0 6px rgba(225,29,72,0.4)' }}
                  />
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* ── RIGHT: Structured text ── */}
          <AnimatedSection animation="slideRight" delay={0.2}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="w-5 h-px bg-[#e11d48]" />
              <span className="text-[#e11d48] text-xs font-bold uppercase tracking-[0.2em] font-mono">About Hokkai Markets</span>
              <div className="w-5 h-px bg-[#e11d48]" />
            </div>

            {/* Heading */}
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: "'Michroma', sans-serif", textTransform: 'uppercase', letterSpacing: '0.03em' }}
            >
              Built on{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Precision
              </span>
              {' '}&amp; Trust
            </h2>

            {/* Neon divider */}
            <div
              className="w-16 h-px mb-6"
              style={{ background: 'linear-gradient(90deg, #e11d48, transparent)', boxShadow: '0 0 6px rgba(225,29,72,0.4)' }}
            />

            <div className="space-y-4 mb-8">
              <p className="text-slate-400 leading-relaxed">
                Hokkai Markets is built on the foundation of transparency, innovation, and performance. Our mission is to bridge the gap between institutional trading technology and retail traders by delivering powerful tools, fair pricing, and secure infrastructure.
              </p>
              <p className="text-slate-400 leading-relaxed">
                We combine cutting-edge trading systems with strong risk management protocols to create a reliable and professional trading environment — giving every trader access to institutional-grade conditions.
              </p>
            </div>

            {/* Pillars grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {pillars.map((p) => (
                <div
                  key={p.label}
                  className="text-center p-4 rounded-xl border border-white/8 transition-all duration-300 hover:border-[#e11d48]/30 hover:-translate-y-0.5 group"
                  style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)' }}
                >
                  <div
                    className="text-xl mb-1"
                    style={{ fontFamily: "'Noto Serif JP', serif", color: 'rgba(225,29,72,0.6)' }}
                  >
                    {p.kanji}
                  </div>
                  <div className="text-slate-400 text-xs group-hover:text-white transition-colors">{p.label}</div>
                </div>
              ))}
            </div>

            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold text-sm rounded-lg transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: '#e11d48',
                boxShadow: '0 0 18px rgba(225,29,72,0.35)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(225,29,72,0.6)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 18px rgba(225,29,72,0.35)'}
            >
              Learn More About Us <FiArrowRight size={15} />
            </Link>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
