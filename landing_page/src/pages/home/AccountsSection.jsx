// ============================================
// HOKKAI MARKETS - Accounts Section — Cyber-Samurai
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiCheck, FiArrowRight } from 'react-icons/fi'
import { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { accounts } from '../HomeData'

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

export default function AccountsSection() {
  return (
    <section
      className="section-padding relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #07090e 0%, #05070a 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="口座" className="absolute -right-4 top-1/2 -translate-y-1/2 text-[180px] text-white/[0.018] font-black" />
      </div>

      <div className="section-container relative z-10">
        <SectionHeader
          badge="Accounts"
          title="Account Types"
          highlight="Account Types"
          subtitle="Choose the account that matches your trading style and experience level."
        />

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
          {accounts.map((acc) => (
            <StaggerItem key={acc.name}>
              <div
                className={`relative rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-2 ${
                  acc.highlight
                    ? 'border border-[#e11d48]/40'
                    : 'border border-white/8 hover:border-white/20'
                }`}
                style={
                  acc.highlight
                    ? {
                        background: 'linear-gradient(145deg, rgba(225,29,72,0.12) 0%, rgba(5,7,10,0.9) 100%)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 40px rgba(225,29,72,0.15)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        backdropFilter: 'blur(12px)',
                      }
                }
              >
                {/* Popular badge */}
                {acc.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="px-4 py-1 text-white text-xs font-bold rounded-full uppercase tracking-wider"
                      style={{
                        background: '#e11d48',
                        boxShadow: '0 0 14px rgba(225,29,72,0.5)',
                        fontFamily: "'Michroma', sans-serif",
                      }}
                    >
                      Popular
                    </span>
                  </div>
                )}

                {/* Mon decoration */}
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full border border-white/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border border-white/10" />
                </div>

                <span className={`badge mb-4 w-fit text-xs ${acc.highlight ? 'bg-white/15 text-white' : acc.badgeColor}`}>
                  {acc.badge}
                </span>

                <h3
                  className="text-xl font-bold mb-1 text-white"
                  style={{ fontFamily: "'Michroma', sans-serif" }}
                >
                  {acc.name}
                </h3>

                <div
                  className="text-2xl font-bold mb-1"
                  style={{
                    fontFamily: "'Michroma', sans-serif",
                    color: acc.highlight ? '#ffffff' : '#e11d48',
                    textShadow: acc.highlight ? 'none' : '0 0 10px rgba(225,29,72,0.4)',
                  }}
                >
                  {acc.minDeposit}
                </div>

                <div className={`text-xs mb-2 ${acc.highlight ? 'text-white/60' : 'text-slate-500'}`}>
                  Minimum Deposit
                </div>

                <div className={`text-sm mb-1 ${acc.highlight ? 'text-white/80' : 'text-slate-400'}`}>
                  Spreads: <span className="font-semibold text-white">{acc.spreads}</span>
                </div>

                <div
                  className={`text-xs mb-4 pb-4 border-b ${
                    acc.highlight ? 'border-white/15 text-white/60' : 'border-white/5 text-slate-500'
                  }`}
                >
                  Commission: {acc.commission}
                </div>

                <p className={`text-xs leading-relaxed mb-4 flex-1 ${acc.highlight ? 'text-white/75' : 'text-slate-400'}`}>
                  {acc.desc}
                </p>

                <ul className="space-y-2 mb-6">
                  {acc.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-xs ${acc.highlight ? 'text-white/85' : 'text-slate-400'}`}>
                      <FiCheck size={11} className={acc.highlight ? 'text-white' : 'text-[#e11d48]'} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/accounts"
                  className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    acc.highlight
                      ? 'bg-white text-[#e11d48] hover:bg-white/90'
                      : 'border border-[#e11d48]/30 text-[#e11d48] hover:bg-[#e11d48]/10'
                  }`}
                >
                  {acc.cta}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="text-center mt-8">
          <Link to="/accounts" className="btn-outline gap-2">
            Compare All Accounts <FiArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
