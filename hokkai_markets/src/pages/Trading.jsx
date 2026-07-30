// ============================================
// HOKKAI MARKETS - Trading Page
// ============================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiCheck, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'
import cardImage2 from '../../img/card_image2_.png'

// Market data for the instruments table
const forexPairs = [
  { pair: 'EUR/USD', bid: '1.08541', ask: '1.08543', spread: '0.2', change: '+0.21%', pos: true },
  { pair: 'GBP/USD', bid: '1.26729', ask: '1.26732', spread: '0.3', change: '+0.32%', pos: true },
  { pair: 'USD/JPY', bid: '149.820', ask: '149.823', spread: '0.3', change: '-0.21%', pos: false },
  { pair: 'USD/CHF', bid: '0.88231', ask: '0.88234', spread: '0.3', change: '-0.14%', pos: false },
  { pair: 'AUD/USD', bid: '0.65419', ask: '0.65422', spread: '0.3', change: '+0.28%', pos: true },
  { pair: 'USD/CAD', bid: '1.35619', ask: '1.35623', spread: '0.4', change: '+0.23%', pos: true },
]

const marketCategories = [
  {
    id: 'forex',
    label: 'Forex',
    icon: '💱',
    title: 'Forex Trading',
    subtitle: 'Trade major, minor, and exotic currency pairs with tight spreads and deep liquidity.',
    features: ['Flexible Leverage', 'Advanced Charting', 'Fast Execution', 'No Requotes'],
    instruments: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD', 'NZD/USD', 'EUR/GBP'],
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    id: 'indices',
    label: 'Indices',
    icon: '📊',
    title: 'Indices Trading',
    subtitle: 'Access global indices and trade market volatility with competitive margins.',
    features: ['Low Margins', 'Extended Hours', 'Real-time Data', 'Hedging Allowed'],
    instruments: ['US30 (Dow Jones)', 'NAS100 (Nasdaq)', 'UK100 (FTSE)', 'GER40 (DAX)', 'FRA40 (CAC)', 'JPN225 (Nikkei)'],
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
  },
  {
    id: 'commodities',
    label: 'Commodities',
    icon: '🥇',
    title: 'Commodities Trading',
    subtitle: 'Hedge against inflation and diversify your portfolio with precious metals and energy.',
    features: ['Inflation Hedge', 'Portfolio Diversification', 'Tight Spreads', 'Deep Liquidity'],
    instruments: ['Gold (XAU/USD)', 'Silver (XAG/USD)', 'Crude Oil (WTI)', 'Brent Oil', 'Natural Gas', 'Copper'],
    color: 'text-red-accent',
    bg: 'bg-red-accent/10',
    border: 'border-red-accent/20',
  },
  {
    id: 'stocks',
    label: 'Stocks',
    icon: '📈',
    title: 'Stock Trading',
    subtitle: 'Invest in global shares from leading companies with flexible margin options.',
    features: ['Global Equities', 'Flexible Margins', 'Dividend Exposure', 'Long & Short'],
    instruments: ['Apple (AAPL)', 'Tesla (TSLA)', 'Amazon (AMZN)', 'Microsoft (MSFT)', 'Google (GOOGL)', 'Meta (META)'],
    color: 'text-green-accent',
    bg: 'bg-green-accent/10',
    border: 'border-green-accent/20',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    icon: '₿',
    title: 'Cryptocurrency Trading',
    subtitle: 'Trade major digital assets 24/7 with secure execution and competitive spreads.',
    features: ['24/7 Trading', 'Secure Execution', 'High Liquidity', 'No Wallet Needed'],
    instruments: ['Bitcoin (BTC)', 'Ethereum (ETH)', 'Litecoin (LTC)', 'Ripple (XRP)', 'Cardano (ADA)', 'Solana (SOL)'],
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
]

function Trading() {
  const [activeTab, setActiveTab] = useState('forex')
  const activeMarket = marketCategories.find(m => m.id === activeTab)

  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiTrendingUp size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Global Markets</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Trade <span className="text-red-gradient">Global Markets</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Access 60+ instruments across forex, indices, commodities, stocks, and crypto — all from one powerful platform with institutional-grade execution.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Start Trading <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline gap-2">
                Open Demo Account
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Market Category Tabs */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Instruments"
            title="Choose Your Market"
            highlight="Your Market"
            subtitle="Explore our full range of tradeable instruments across all major asset classes."
          />

          {/* Tab Navigation */}
          <AnimatedSection animation="slideUp" delay={0.2} className="flex flex-wrap justify-center gap-2 mt-10 mb-12">
            {marketCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === cat.id
                    ? 'bg-red-accent text-white shadow-lg shadow-red-accent/20'
                    : 'bg-dark-600 text-gray-400 border border-white/5 hover:border-red-accent/20 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </AnimatedSection>

          {/* Active Market Content */}
          {activeMarket && (
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left: Info */}
              <AnimatedSection animation="slideLeft" key={activeTab}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${activeMarket.bg} ${activeMarket.border} border mb-4`}>
                  <span className="text-xl">{activeMarket.icon}</span>
                  <span className={`text-sm font-semibold ${activeMarket.color}`}>{activeMarket.label}</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">{activeMarket.title}</h2>
                <p className="text-gray-400 mb-6">{activeMarket.subtitle}</p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {activeMarket.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 p-3 rounded-lg bg-dark-600 border border-white/5">
                      <FiCheck size={14} className="text-red-accent flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{f}</span>
                    </div>
                  ))}
                </div>

                <Link to="/accounts" className="btn-primary gap-2">
                  Trade {activeMarket.label} Now <FiArrowRight size={16} />
                </Link>
              </AnimatedSection>

              {/* Right: Instruments + Image */}
              <AnimatedSection animation="slideRight" key={`${activeTab}-right`}>
                {/* Card Image */}
                <div className="rounded-2xl overflow-hidden border border-white/5 aspect-video w-full mb-6">
                  <img
                    src={cardImage2}
                    alt="Trading Platform"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Instruments list */}
                <div className="bg-dark-600 rounded-xl border border-white/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <h4 className="text-white font-semibold text-sm">Available Instruments</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-0">
                    {activeMarket.instruments.map((inst, i) => (
                      <div key={inst} className={`px-4 py-2.5 text-sm text-gray-300 flex items-center gap-2 ${
                        i % 2 === 0 ? 'border-r border-white/5' : ''
                      } border-b border-white/5 hover:bg-white/2 transition-colors`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-accent flex-shrink-0"></div>
                        {inst}
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            </div>
          )}
        </div>
      </section>

      {/* Live Forex Table */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Live Rates"
            title="Live Market Rates"
            highlight="Live Market"
            subtitle="Real-time indicative prices for major forex pairs."
          />
          <AnimatedSection animation="slideUp" delay={0.2} className="mt-10 overflow-x-auto">
            <div className="bg-dark-600 rounded-2xl border border-white/5 overflow-hidden">
              <table className="data-table w-full">
                <thead>
                  <tr className="bg-dark-700">
                    <th>Instrument</th>
                    <th>Bid</th>
                    <th>Ask</th>
                    <th>Spread</th>
                    <th>Change</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {forexPairs.map((row) => (
                    <tr key={row.pair} className="hover:bg-white/2 transition-colors">
                      <td className="font-semibold text-white">{row.pair}</td>
                      <td className="font-mono">{row.bid}</td>
                      <td className="font-mono">{row.ask}</td>
                      <td className="font-mono text-red-accent">{row.spread}</td>
                      <td className={`font-mono font-semibold flex items-center gap-1 ${row.pos ? 'text-green-accent' : 'text-red-accent'}`}>
                        {row.pos ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                        {row.change}
                      </td>
                      <td>
                        <Link to="/accounts" className="text-xs px-3 py-1.5 rounded-lg bg-red-accent/10 text-red-accent border border-red-accent/20 hover:bg-red-accent/20 transition-colors">
                          Trade
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Trading Conditions */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Conditions"
            title="Trading Conditions"
            highlight="Trading Conditions"
            subtitle="Transparent, competitive conditions designed for all types of traders."
          />
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {[
              { title: 'Tight Spreads', value: 'From 0.0 pips', desc: 'Raw ECN spreads with no markup on our ECN Raw account.', icon: '📉' },
              { title: 'Fast Execution', value: '< 1ms', desc: 'Millisecond order execution with no requotes or rejections.', icon: '⚡' },
              { title: 'High Leverage', value: 'Up to 1:500', desc: 'Flexible leverage options to suit your trading strategy.', icon: '🔧' },
              { title: 'Deep Liquidity', value: 'Tier-1 LPs', desc: 'Access to top-tier liquidity providers for best pricing.', icon: '💧' },
              { title: 'No Dealing Desk', value: 'NDD Model', desc: 'Straight-through processing with no conflict of interest.', icon: '🏦' },
              { title: '24/5 Markets', value: 'Always Open', desc: 'Trade forex and indices 24 hours a day, 5 days a week.', icon: '🕐' },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="card group text-center">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <div className="text-2xl font-bold text-red-gradient mb-1">{item.value}</div>
                  <h3 className="text-white font-semibold mb-2 group-hover:text-red-light transition-colors">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-800">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start <span className="text-red-gradient">Trading?</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Open a live or demo account in minutes and access all global markets instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Open Live Account <FiArrowRight size={16} />
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

export default Trading
