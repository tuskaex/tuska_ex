// ============================================
// HOKKAI MARKETS - Accounts Page
// ============================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCheck, FiX, FiUser, FiShield, FiZap } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'
import cardImage4 from '../../img/card_image_4.png'

const accounts = [
  {
    name: 'Standard',
    badge: 'Best for Beginners',
    badgeColor: 'bg-blue-500/20 text-blue-400',
    minDeposit: '$100',
    spreads: 'From 1.5 pips',
    commission: 'None',
    leverage: 'Up to 1:500',
    execution: 'Market',
    instruments: '60+',
    highlight: false,
    color: 'border-blue-400/20',
    features: [
      { label: 'Minimum Deposit', value: '$100' },
      { label: 'Spreads From', value: '1.5 pips' },
      { label: 'Commission', value: 'None' },
      { label: 'Max Leverage', value: '1:500' },
      { label: 'Execution Type', value: 'Market' },
      { label: 'Instruments', value: '60+' },
      { label: 'Swap-Free Option', value: 'Available' },
      { label: 'Copy Trading', value: 'Included' },
    ],
    pros: ['Zero commission', 'Low minimum deposit', 'Full platform access', '24/5 support'],
    cta: 'Open Standard Account',
  },
  {
    name: 'ECN Raw',
    badge: 'Most Popular',
    badgeColor: 'bg-red-accent/20 text-red-accent',
    minDeposit: '$500',
    spreads: 'From 0.0 pips',
    commission: 'Low fixed',
    leverage: 'Up to 1:500',
    execution: 'ECN/STP',
    instruments: '60+',
    highlight: true,
    color: 'border-red-accent/40',
    features: [
      { label: 'Minimum Deposit', value: '$500' },
      { label: 'Spreads From', value: '0.0 pips' },
      { label: 'Commission', value: 'Low fixed' },
      { label: 'Max Leverage', value: '1:500' },
      { label: 'Execution Type', value: 'ECN/STP' },
      { label: 'Instruments', value: '60+' },
      { label: 'Swap-Free Option', value: 'Available' },
      { label: 'Copy Trading', value: 'Included' },
    ],
    pros: ['Raw spreads from 0.0', 'Scalping allowed', 'Ultra-low commission', 'Priority execution'],
    cta: 'Open ECN Raw Account',
  },
  {
    name: 'Pro',
    badge: 'For Experienced Traders',
    badgeColor: 'bg-purple-500/20 text-purple-400',
    minDeposit: '$5,000',
    spreads: 'Ultra-tight',
    commission: 'Reduced',
    leverage: 'Up to 1:200',
    execution: 'ECN/STP',
    instruments: '60+',
    highlight: false,
    color: 'border-purple-400/20',
    features: [
      { label: 'Minimum Deposit', value: '$5,000' },
      { label: 'Spreads From', value: 'Ultra-tight' },
      { label: 'Commission', value: 'Reduced' },
      { label: 'Max Leverage', value: '1:200' },
      { label: 'Execution Type', value: 'ECN/STP' },
      { label: 'Instruments', value: '60+' },
      { label: 'Swap-Free Option', value: 'Available' },
      { label: 'Dedicated Support', value: 'Included' },
    ],
    pros: ['Tightest spreads', 'Priority execution', 'Dedicated account manager', 'Advanced analytics'],
    cta: 'Open Pro Account',
  },
  {
    name: 'VIP',
    badge: 'Institutional Grade',
    badgeColor: 'bg-red-accent/20 text-red-accent',
    minDeposit: 'Custom',
    spreads: 'Custom pricing',
    commission: 'Negotiable',
    leverage: 'Custom',
    execution: 'Institutional',
    instruments: '60+',
    highlight: false,
    color: 'border-red-accent/20',
    features: [
      { label: 'Minimum Deposit', value: 'Custom' },
      { label: 'Spreads From', value: 'Custom' },
      { label: 'Commission', value: 'Negotiable' },
      { label: 'Max Leverage', value: 'Custom' },
      { label: 'Execution Type', value: 'Institutional' },
      { label: 'Instruments', value: '60+' },
      { label: 'Personal Manager', value: 'Dedicated' },
      { label: 'Market Insights', value: 'Exclusive' },
    ],
    pros: ['Personal relationship manager', 'Exclusive market insights', 'Institutional liquidity', 'Custom solutions'],
    cta: 'Contact Us',
  },
]

const steps = [
  { step: '01', title: 'Register', desc: 'Fill in your personal details and create your account in minutes.' },
  { step: '02', title: 'Verify', desc: 'Submit your ID and proof of address for quick KYC verification.' },
  { step: '03', title: 'Fund', desc: 'Deposit funds using your preferred payment method securely.' },
  { step: '04', title: 'Trade', desc: 'Access all markets and start trading with professional tools.' },
]

function Accounts() {
  const [selected, setSelected] = useState('ECN Raw')

  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-red-accent/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiUser size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Account Types</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Choose Your <span className="text-red-gradient">Trading Account</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              From beginner-friendly Standard accounts to institutional-grade VIP solutions — we have the perfect account for every trader.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary gap-2">
                Open Account <FiArrowRight size={16} />
              </Link>
              <Link to="/contact" className="btn-outline gap-2">
                Talk to an Expert
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Account Cards */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Accounts"
            title="Account Types"
            highlight="Account Types"
            subtitle="Transparent conditions, competitive pricing, and professional tools for every level."
          />

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {accounts.map((acc) => (
              <StaggerItem key={acc.name}>
                <div
                  className={`relative rounded-2xl border p-6 h-full flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-2 ${
                    acc.highlight
                      ? 'bg-gradient-to-b from-red-accent/15 to-dark-600 border-red-accent/40 shadow-xl shadow-red-accent/10'
                      : `bg-dark-600 ${acc.color} hover:shadow-lg`
                  }`}
                  onClick={() => setSelected(acc.name)}
                >
                  {/* Popular badge */}
                  {acc.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 bg-red-accent text-white text-xs font-bold rounded-full shadow-lg">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <span className={`badge mb-4 w-fit ${acc.badgeColor}`}>{acc.badge}</span>

                  <h3 className="text-2xl font-bold text-white mb-4">{acc.name}</h3>

                  {/* Key stats */}
                  <div className="space-y-2 mb-6 flex-1">
                    {acc.features.map((f) => (
                      <div key={f.label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                        <span className="text-gray-400 text-xs">{f.label}</span>
                        <span className="text-white text-xs font-semibold">{f.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pros */}
                  <div className="space-y-1.5 mb-6">
                    {acc.pros.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs text-gray-300">
                        <FiCheck size={11} className="text-red-accent flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/contact"
                    className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      acc.highlight
                        ? 'bg-red-accent text-white hover:bg-red-light shadow-lg shadow-red-accent/20'
                        : 'border border-red-accent/30 text-red-accent hover:bg-red-accent/10'
                    }`}
                  >
                    {acc.cta}
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How to Open Account */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Get Started"
            title="How to Open an Account"
            highlight="Open an Account"
            subtitle="Get started in 4 simple steps. The entire process takes less than 10 minutes."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-red-accent/30 to-transparent"></div>

            {steps.map((step, i) => (
              <AnimatedSection key={step.step} animation="slideUp" delay={i * 0.1}>
                <div className="text-center relative">
                  <div className="w-16 h-16 rounded-2xl bg-red-accent/10 border border-red-accent/20 flex items-center justify-center mx-auto mb-4 relative z-10">
                    <span className="text-red-accent font-bold text-lg">{step.step}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection animation="slideUp" delay={0.5} className="text-center mt-12">
            <Link to="/contact" className="btn-primary gap-2 text-base px-8 py-3.5">
              Open Your Account Now <FiArrowRight size={16} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Fund Safety */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Fund Safety Image */}
            <AnimatedSection animation="slideLeft">
              <div className="rounded-2xl overflow-hidden border border-white/5 aspect-square w-full max-w-md mx-auto">
                <img
                  src={cardImage4}
                  alt="Fund Security"
                  className="w-full h-full object-cover"
                />
              </div>
            </AnimatedSection>

            <div>
              <SectionHeader
                badge="Security"
                title="Your Funds Are Safe With Us"
                highlight="Safe With Us"
                subtitle="We take the security of your funds and personal data extremely seriously."
                align="left"
              />
              <div className="space-y-4 mt-8">
                {[
                  { icon: <FiShield />, title: 'Segregated Client Accounts', desc: 'Your funds are held in segregated accounts at top-tier banks, completely separate from company funds.' },
                  { icon: <FiZap />, title: 'Advanced SSL Encryption', desc: 'All data transmissions are protected with 256-bit SSL encryption technology.' },
                  { icon: <FiUser />, title: 'KYC & AML Compliance', desc: 'Strict Know Your Customer and Anti-Money Laundering procedures protect all clients.' },
                ].map((item, i) => (
                  <AnimatedSection key={item.title} animation="slideRight" delay={i * 0.1}>
                    <div className="flex gap-4 p-4 rounded-xl bg-dark-600 border border-white/5 hover:border-green-accent/20 transition-all duration-300">
                      <div className="w-10 h-10 rounded-lg bg-green-accent/10 flex items-center justify-center text-green-accent flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-800">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Open Your <span className="text-red-gradient">Trading Account?</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Join thousands of traders worldwide. Open a live account or start with a free demo.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary gap-2">
                Open Live Account <FiArrowRight size={16} />
              </Link>
              <Link to="/contact" className="btn-secondary gap-2">
                Open Demo Account
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default Accounts
