// ============================================
// HOKKAI MARKETS - Hero Section — Cyber-Samurai
// Cinematic: video + glow + scan lines + data chips
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiPlay, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import heroBg from '../../../video/hokkai_video_1.mp4'

// Live data chips shown below the CTA
const liveChips = [
  { label: 'EUR/USD', value: '1.0854', change: '+0.21%', positive: true },
  { label: 'XAU/USD', value: '2,034',  change: '+0.40%', positive: true },
  { label: 'BTC/USD', value: '43,215', change: '-0.72%', positive: false },
  { label: 'US30',    value: '38,654', change: '+0.32%', positive: true },
]


export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── Background Video ── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={heroBg}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* ── Multi-layer Cyber Gradient Overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(5,7,10,0.55) 0%,
              rgba(1,2,3,0.65) 50%,
              rgba(1,2,3,0.92) 100%
            )
          `,
        }}
      />

      {/* ── Crimson Glow Halo (behind content) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 55%,
              rgba(225,29,72,0.13) 0%,
              transparent 70%
            )
          `,
        }}
      />

      {/* ── Scan-line Overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
        }}
      />

      {/* ── Subtle Grid ── */}
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

      {/* ── Side Accent Lines ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(225,29,72,0.35), transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(225,29,72,0.15), transparent)' }}
      />

      {/* ── Decorative corner brackets ── */}
      {/* Top-left */}
      <div className="absolute top-24 left-6 md:left-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-t border-l border-[#e11d48]/60" />
      </div>
      {/* Top-right */}
      <div className="absolute top-24 right-6 md:right-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-t border-r border-[#e11d48]/60" />
      </div>
      {/* Bottom-left */}
      <div className="absolute bottom-24 left-6 md:left-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-b border-l border-[#e11d48]/60" />
      </div>
      {/* Bottom-right */}
      <div className="absolute bottom-24 right-6 md:right-12 pointer-events-none opacity-40">
        <div className="w-8 h-8 border-b border-r border-[#e11d48]/60" />
      </div>

      {/* ── Decorative Kanji watermark ── */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 text-[220px] font-black pointer-events-none select-none hidden xl:block"
        style={{
          fontFamily: "'Noto Serif JP', serif",
          color: 'rgba(255,255,255,0.018)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        北海
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto w-full">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#e11d48] animate-pulse"
              style={{ boxShadow: '0 0 6px rgba(225,29,72,0.9)' }}
            />
            <span className="text-[#e11d48] text-xs font-bold uppercase tracking-[0.25em] font-mono">
              Live Markets — 24/5 Trading
            </span>
            <span className="text-white/20 text-xs">|</span>
            <span className="text-slate-400 text-xs font-mono">60+ Instruments</span>
          </div>
        </motion.div>

        {/* Main Heading — Michroma futuristic */}
        <div>
          {/* Line 1: TRADE GLOBAL */}
          <h1
            className="font-bold text-white leading-none mb-3"
            style={{
              fontFamily: "'Michroma', sans-serif",
              fontSize: 'clamp(2.4rem, 7vw, 5.5rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textShadow: '0 0 60px rgba(225,29,72,0.25)',
            }}
          >
            TRADE GLOBAL
          </h1>

          {/* Line 2: MARKETS — gradient preserved */}
          <h1
            className="font-bold leading-none mb-6"
            style={{
              fontFamily: "'Michroma', sans-serif",
              fontSize: 'clamp(2.4rem, 7vw, 5.5rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 60%, #ff6b81 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(225,29,72,0.5))',
            }}
          >
            MARKETS
          </h1>
        </div>

        {/* Neon divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center mb-6"
        >
          <div
            className="w-24 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #e11d48, transparent)', boxShadow: '0 0 8px rgba(225,29,72,0.6)' }}
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="text-slate-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Institutional-grade execution. Zero compromise.
          Access <span className="text-white font-semibold">60+ instruments</span> with{' '}
          <span className="text-[#e11d48] font-semibold">millisecond precision</span>.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-wrap justify-center gap-4 mb-14"
        >
          {/* Primary — Crimson Neon */}
          <Link
            to="/accounts"
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold text-sm rounded-lg transition-all duration-300 hover:-translate-y-0.5 uppercase tracking-wider"
            style={{
              fontFamily: "'Michroma', sans-serif",
              background: '#e11d48',
              boxShadow: '0 0 20px rgba(225,29,72,0.45), 0 0 60px rgba(225,29,72,0.15)',
              letterSpacing: '0.08em',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 35px rgba(225,29,72,0.7), 0 0 80px rgba(225,29,72,0.25)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(225,29,72,0.45), 0 0 60px rgba(225,29,72,0.15)'}
          >
            Open Live Account <FiArrowRight size={15} />
          </Link>

          {/* Ghost — White border */}
          <Link
            to="/accounts"
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-semibold text-sm rounded-lg transition-all duration-300 hover:bg-white/8 hover:-translate-y-0.5 uppercase tracking-wider border border-white/25 hover:border-white/50"
            style={{ fontFamily: "'Michroma', sans-serif", letterSpacing: '0.08em' }}
          >
            <FiPlay size={13} /> Try Free Demo
          </Link>
        </motion.div>

        {/* Live Data Chips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {liveChips.map((chip) => (
            <div
              key={chip.label}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/8 transition-all duration-300 hover:border-white/20"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
            >
              <span className="text-white text-xs font-mono font-bold tracking-wider">{chip.label}</span>
              <span className="text-slate-400 text-xs font-mono">{chip.value}</span>
              <span
                className={`flex items-center gap-0.5 text-xs font-mono font-semibold ${
                  chip.positive ? 'text-[#00d4aa]' : 'text-[#e11d48]'
                }`}
              >
                {chip.positive ? <FiTrendingUp size={9} /> : <FiTrendingDown size={9} />}
                {chip.change}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll Indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-mono">Scroll</span>
        <div
          className="w-px h-10"
          style={{ background: 'linear-gradient(180deg, rgba(225,29,72,0.6), transparent)' }}
        />
      </motion.div>

    </section>
  )
}
