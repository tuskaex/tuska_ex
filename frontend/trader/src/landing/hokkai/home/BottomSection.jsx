'use client'

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiPlay, FiChevronDown, FiTrendingUp } from 'react-icons/fi'
import AnimatedSection from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import { faqs } from '../HomeData'

function Kanji({ char, className = '' }) {
  return <span className={`jp-kanji select-none pointer-events-none ${className}`} aria-hidden="true">{char}</span>
}

function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false)
  return (
    <AnimatedSection animation="slideUp" delay={index * 0.08}>
      <div
        className={`border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${open ? 'border-red-accent/30 bg-red-accent/5' : 'border-white/5 bg-dark-600 hover:border-white/10'}`}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between p-5">
          <h4 className="text-white font-medium text-sm pr-4">{q}</h4>
          <span className={`flex-shrink-0 transition-transform duration-300 ${open ? 'text-red-accent rotate-180' : 'text-gray-400'}`}>
            <FiChevronDown size={18} />
          </span>
        </div>
        <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
          <p className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">{a}</p>
        </motion.div>
      </div>
    </AnimatedSection>
  )
}

export default function BottomSection() {
  return (
    <>
      {/* TESTIMONIALS — REMOVED, DO NOT RESTORE WITHOUT REAL CLIENTS.
          This section rendered three five-star reviews from "Michael R.",
          "Sarah K." and "David L.", one of whom claimed to have traded
          with us "for over a year", under a subtitle reading "Trusted by
          thousands of traders worldwide".
          None of them existed. The users table held four rows.
          Testimonials go back only when they come from real, consenting
          clients — invented social proof is a fabricated endorsement,
          and in a regulated industry it is the kind that gets acted on.
          The FAQ below is unaffected. */}

      {/* FAQ */}
      <section className="section-padding bg-dark-800 relative overflow-hidden">
        <div className="absolute inset-0 shoji-bg opacity-20 pointer-events-none" />
        <div className="section-container relative z-10">
          <SectionHeader
            kanji="質問"
            reading="shitsumon"
            badge="FAQ"
            title="Frequently Asked Questions"
            highlight="Frequently Asked"
            subtitle="Find answers to the most common questions about trading with TuskaEx."
          />
          <div className="max-w-3xl mx-auto mt-12 space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="section-padding bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 jp-wave-bg opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-red-accent/5 rounded-full blur-3xl" />
          <Kanji char="成功" className="absolute -left-4 top-1/2 -translate-y-1/2 text-[180px] text-white/[0.02] font-black" />
          <Kanji char="勝利" className="absolute -right-4 top-1/2 -translate-y-1/2 text-[180px] text-white/[0.02] font-black" />
        </div>
        {/* Torii accent lines */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-red-accent/25 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-red-accent/25 to-transparent pointer-events-none" />

        <div className="section-container relative z-10 text-center">
          <AnimatedSection animation="slideUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiTrendingUp size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-widest">Start Trading Today</span>
              <span className="text-red-accent/50 text-xs jp-kanji">今すぐ</span>
            </div>
          </AnimatedSection>
          <AnimatedSection animation="slideUp" delay={0.1}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to open your <span className="text-red-gradient">first position?</span>
            </h2>
          </AnimatedSection>
          <AnimatedSection animation="fadeIn" delay={0.2}>
            {/* Was "Join thousands of traders who trust TuskaEx…". There
                were four users. Replaced with the offer itself, which is
                true today and does not expire as the platform grows. */}
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              59 instruments, leverage to 1:100, and a demo account on live prices
              that costs nothing and needs no deposit.
            </p>
          </AnimatedSection>
          <AnimatedSection animation="slideUp" delay={0.3}>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary text-base px-8 py-3.5 gap-2">
                Open Live Account <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline text-base px-8 py-3.5 gap-2">
                <FiPlay size={14} /> Try Free Demo
              </Link>
            </div>
          </AnimatedSection>

          {/* Japanese decorative divider at bottom */}
          <div className="flex items-center justify-center gap-3 mt-12 opacity-30">
            <div className="w-16 h-px bg-red-accent" />
            <div className="jp-kanji text-red-accent text-sm">タスカEX</div>
            <div className="w-16 h-px bg-red-accent" />
          </div>
        </div>
      </section>
    </>
  )
}
