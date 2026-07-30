import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiPlay, FiStar, FiChevronDown, FiTrendingUp } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { testimonials, faqs } from '../HomeData'

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
      {/* TESTIMONIALS */}
      <section className="section-padding bg-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Kanji char="声" className="absolute -right-4 top-1/2 -translate-y-1/2 text-[200px] text-white/[0.02] font-black" />
        </div>
        <div className="section-container relative z-10">
          <SectionHeader
            badge="Testimonials"
            title="What Our Clients Say"
            highlight="Clients Say"
            subtitle="Trusted by thousands of traders worldwide."
          />
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {testimonials.map((t, i) => (
              <StaggerItem key={i}>
                <div className="card jp-card h-full flex flex-col relative overflow-hidden">
                  <div className="absolute top-3 right-3 jp-kanji text-2xl text-white/[0.04] font-black">声</div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <FiStar key={j} size={14} style={{ color: '#c9a84c', fill: '#c9a84c' }} />
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-5 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <div className="w-9 h-9 rounded-full bg-red-accent/20 flex items-center justify-center text-red-accent font-bold text-sm">
                      {t.author[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{t.author}</div>
                      <div className="text-gray-500 text-xs">{t.role}</div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-dark-800 relative overflow-hidden">
        <div className="absolute inset-0 shoji-bg opacity-20 pointer-events-none" />
        <div className="section-container relative z-10">
          <SectionHeader
            badge="FAQ"
            title="Frequently Asked Questions"
            highlight="Frequently Asked"
            subtitle="Find answers to the most common questions about trading with Hokkai Markets."
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
              Ready to Trade with <span className="text-red-gradient">Institutional Precision?</span>
            </h2>
          </AnimatedSection>
          <AnimatedSection animation="fadeIn" delay={0.2}>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of traders who trust Hokkai Markets for professional-grade execution, transparent pricing, and competitive conditions.
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
            <div className="jp-kanji text-red-accent text-sm">北海マーケット</div>
            <div className="w-16 h-px bg-red-accent" />
          </div>
        </div>
      </section>
    </>
  )
}
