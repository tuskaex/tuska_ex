// ============================================
// HOKKAI MARKETS - Pricing Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCheck, FiDollarSign, FiInfo } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'
import cardImage5 from '../../img/card_image_5.png'
import ForexHeatmap from '../components/ForexHeatmap'
import GlobalMarketHeatmap from '../components/GlobalMarketHeatmap'
import MarketSentiment from '../components/MarketSentiment'

const spreadData = [
  { instrument: 'EUR/USD', standard: '1.5', ecn: '0.1', pro: '0.0', type: 'Forex' },
  { instrument: 'GBP/USD', standard: '1.8', ecn: '0.2', pro: '0.1', type: 'Forex' },
  { instrument: 'USD/JPY', standard: '1.6', ecn: '0.1', pro: '0.0', type: 'Forex' },
  { instrument: 'AUD/USD', standard: '1.7', ecn: '0.2', pro: '0.1', type: 'Forex' },
  { instrument: 'XAU/USD', standard: '0.35', ecn: '0.15', pro: '0.10', type: 'Metal' },
  { instrument: 'XAG/USD', standard: '0.04', ecn: '0.02', pro: '0.01', type: 'Metal' },
  { instrument: 'US30', standard: '3.0', ecn: '1.5', pro: '1.0', type: 'Index' },
  { instrument: 'NAS100', standard: '2.0', ecn: '1.0', pro: '0.8', type: 'Index' },
  { instrument: 'OIL/USD', standard: '0.05', ecn: '0.03', pro: '0.02', type: 'Energy' },
  { instrument: 'BTC/USD', standard: '50', ecn: '30', pro: '20', type: 'Crypto' },
]

const pricingFeatures = [
  {
    icon: '📉',
    title: 'Tight Variable Spreads',
    desc: 'Our spreads are dynamically priced based on real market conditions, ensuring you always get the best available price.',
  },
  {
    icon: '💰',
    title: 'Competitive Commission',
    desc: 'ECN Raw accounts offer ultra-low fixed commissions per lot, making it ideal for high-volume traders and scalpers.',
  },
  {
    icon: '🚫',
    title: 'No Hidden Fees',
    desc: 'We believe in complete transparency. No deposit fees, no withdrawal fees, no inactivity fees on active accounts.',
  },
  {
    icon: '🔄',
    title: 'Swap-Free Option',
    desc: 'Islamic swap-free accounts available for traders who require Sharia-compliant trading conditions.',
  },
  {
    icon: '💳',
    title: 'Free Deposits',
    desc: 'Deposit funds at no cost via bank transfer, credit/debit card, and major e-wallets.',
  },
  {
    icon: '⚡',
    title: 'Fast Withdrawals',
    desc: 'Withdrawals processed within 24 hours on business days. No unnecessary delays.',
  },
]

const commissionTable = [
  { account: 'Standard', spread: 'From 1.5 pips', commission: '$0', overnight: 'Standard', deposit: 'Free', withdrawal: 'Free' },
  { account: 'ECN Raw', spread: 'From 0.0 pips', commission: '$3.50/lot', overnight: 'Standard', deposit: 'Free', withdrawal: 'Free' },
  { account: 'Pro', spread: 'Ultra-tight', commission: '$2.50/lot', overnight: 'Reduced', deposit: 'Free', withdrawal: 'Free' },
  { account: 'VIP', spread: 'Custom', commission: 'Negotiable', overnight: 'Custom', deposit: 'Free', withdrawal: 'Free' },
]

function Pricing() {
  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-green-accent/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiDollarSign size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Transparent Pricing</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Transparent <span className="text-red-gradient">Pricing Model</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              We believe in complete transparency. No hidden fees, no surprises — just competitive spreads and fair trading conditions for every trader.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Open Account <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline gap-2">
                Compare Accounts
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Highlights */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Our Pricing"
            title="What Makes Our Pricing Fair"
            highlight="Pricing Fair"
            subtitle="Competitive, transparent, and designed to give you the best possible trading conditions."
          />
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {pricingFeatures.map((item) => (
              <StaggerItem key={item.title}>
                <div className="card group h-full">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-red-light transition-colors">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Commission Table */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Fee Structure"
            title="Account Fee Structure"
            highlight="Fee Structure"
            subtitle="A complete breakdown of costs for each account type."
          />
          <AnimatedSection animation="slideUp" delay={0.2} className="mt-10 overflow-x-auto">
            <div className="bg-dark-600 rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-700">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-6">Account</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-4">Spread</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-4">Commission</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-4">Overnight</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-4">Deposit</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-4">Withdrawal</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionTable.map((row, i) => (
                    <tr key={row.account} className={`border-t border-white/5 ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                      <td className="py-4 px-6 font-semibold text-white">{row.account}</td>
                      <td className="py-4 px-4 text-red-accent font-mono text-sm">{row.spread}</td>
                      <td className="py-4 px-4 text-gray-300 text-sm">{row.commission}</td>
                      <td className="py-4 px-4 text-gray-300 text-sm">{row.overnight}</td>
                      <td className="py-4 px-4 text-green-accent text-sm font-semibold">{row.deposit}</td>
                      <td className="py-4 px-4 text-green-accent text-sm font-semibold">{row.withdrawal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 mt-3 px-1">
              <FiInfo size={13} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">Spreads are variable and may widen during low liquidity periods or major news events. Commission is per side per standard lot.</p>
            </div>
          </AnimatedSection>

          {/* Forex Heatmap */}
          <AnimatedSection animation="slideUp" delay={0.3} className="mt-10">
            <div className="mb-4">
              <h3 className="text-white font-semibold text-lg mb-1">Forex Heatmap</h3>
              <p className="text-gray-400 text-sm">Visualise currency strength and weakness across all major pairs at a glance.</p>
            </div>
            <ForexHeatmap />
          </AnimatedSection>

          {/* Global Market Heatmap */}
          <AnimatedSection animation="slideUp" delay={0.4} className="mt-10">
            <div className="mb-4">
              <h3 className="text-white font-semibold text-lg mb-1">Global Market Heatmap</h3>
              <p className="text-gray-400 text-sm">Explore global equity markets grouped by sector and weighted by market cap.</p>
            </div>
            <GlobalMarketHeatmap />
          </AnimatedSection>

          {/* Market Sentiment */}
          <AnimatedSection animation="slideUp" delay={0.5} className="mt-10">
            <div className="mb-4">
              <h3 className="text-white font-semibold text-lg mb-1">Market Sentiment</h3>
              <p className="text-gray-400 text-sm">Technical analysis signals showing buy, sell and neutral sentiment across timeframes.</p>
            </div>
            <MarketSentiment />
          </AnimatedSection>
        </div>
      </section>

      {/* Spread Comparison */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Spreads"
            title="Indicative Spreads by Instrument"
            highlight="Indicative Spreads"
            subtitle="Compare typical spreads across our account types for popular instruments."
          />
          <AnimatedSection animation="slideUp" delay={0.2} className="mt-10 overflow-x-auto">
            <div className="bg-dark-600 rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-700">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-6">Instrument</th>
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-4">Type</th>
                    <th className="text-left text-xs font-semibold text-blue-400 uppercase tracking-wider py-4 px-4">Standard</th>
                    <th className="text-left text-xs font-semibold text-red-accent uppercase tracking-wider py-4 px-4">ECN Raw</th>
                    <th className="text-left text-xs font-semibold text-purple-400 uppercase tracking-wider py-4 px-4">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {spreadData.map((row, i) => (
                    <tr key={row.instrument} className={`border-t border-white/5 ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                      <td className="py-3 px-6 font-semibold text-white text-sm">{row.instrument}</td>
                      <td className="py-3 px-4">
                        <span className="badge bg-white/5 text-gray-400 text-xs">{row.type}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-blue-300">{row.standard}</td>
                      <td className="py-3 px-4 font-mono text-sm text-red-accent">{row.ecn}</td>
                      <td className="py-3 px-4 font-mono text-sm text-purple-300">{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 mt-3 px-1">
              <FiInfo size={13} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">All spreads shown in pips. These are indicative values during normal market conditions.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Swap-Free */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionHeader
                badge="Islamic Accounts"
                title="Swap-Free Trading Available"
                highlight="Swap-Free"
                subtitle="We offer Islamic swap-free accounts for traders who require Sharia-compliant trading conditions."
                align="left"
              />
              <div className="space-y-3 mt-8">
                {[
                  'No overnight swap charges',
                  'Available on all account types',
                  'Full access to all instruments',
                  'Same competitive spreads',
                  'Instant account conversion',
                  'No additional fees',
                ].map((item, i) => (
                  <AnimatedSection key={item} animation="slideLeft" delay={i * 0.07}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-600/50 border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-red-accent/20 flex items-center justify-center flex-shrink-0">
                        <FiCheck size={11} className="text-red-accent" />
                      </div>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
              <AnimatedSection animation="slideUp" delay={0.5} className="mt-6">
                <Link to="/contact" className="btn-primary gap-2">
                  Request Swap-Free Account <FiArrowRight size={16} />
                </Link>
              </AnimatedSection>
            </div>
            {/* Swap-Free Image */}
            <AnimatedSection animation="slideRight" delay={0.2}>
              <div className="rounded-2xl overflow-hidden border border-white/5 aspect-square w-full max-w-md mx-auto">
                <img
                  src={cardImage5}
                  alt="Swap-Free Trading"
                  className="w-full h-full object-cover"
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-900">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start Trading with <span className="text-red-gradient">Transparent Pricing</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              No hidden fees. No surprises. Just competitive conditions and professional execution.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Open Account <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-secondary gap-2">
                Try Demo Free
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default Pricing
