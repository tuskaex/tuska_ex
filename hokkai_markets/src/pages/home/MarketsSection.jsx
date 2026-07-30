// ============================================
// HOKKAI MARKETS - Markets Section — Cyber-Samurai
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { marketAssets } from '../HomeData'

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

export default function MarketsSection() {
  return (
    <section
      className="section-padding relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #07090e 0%, #05070a 100%)' }}
    >
      {/* Background kanji */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="取引" className="absolute -right-4 bottom-10 text-[180px] text-white/[0.018] font-black" />
      </div>
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="section-container relative z-10">
        <SectionHeader
          badge="Markets"
          title="Global Markets Access"
          highlight="Global Markets"
          subtitle="At Hokkai Markets, you can access a wide range of global financial instruments from a single account."
        />

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {marketAssets.map((asset) => (
            <StaggerItem key={asset.label}>
              <div className="card jp-card group h-full relative overflow-hidden">
                {/* Kanji watermark */}
                <div
                  className="absolute top-3 right-3 text-2xl text-white/[0.05] font-black pointer-events-none select-none"
                  style={{ fontFamily: "'Noto Serif JP', serif" }}
                >
                  {asset.kanji}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{asset.icon}</span>
                  <h3 className="text-white font-semibold text-lg group-hover:text-[#f43f5e] transition-colors">
                    {asset.label}
                  </h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{asset.desc}</p>
              </div>
            </StaggerItem>
          ))}

          {/* CTA card */}
          <StaggerItem>
            <div
              className="card jp-card h-full flex flex-col items-center justify-center text-center border-dashed border-[#e11d48]/20 hover:border-[#e11d48]/40 min-h-[160px]"
            >
              <div
                className="text-4xl mb-3 text-[#e11d48]/40"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                他
              </div>
              <p className="text-slate-400 text-sm mb-4">And many more instruments available</p>
              <Link to="/trading" className="btn-primary gap-2 text-sm">
                Explore All Markets <FiArrowRight size={14} />
              </Link>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </section>
  )
}
