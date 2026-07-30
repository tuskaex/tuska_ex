// ============================================
// HOKKAI MARKETS - Platforms Page
// ============================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight, FiCheck, FiMonitor, FiSmartphone,
  FiCpu, FiWifi, FiZap, FiShield, FiBarChart2
} from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'
import cardImage3 from '../../img/card_image_3.png'

const platforms = [
  {
    id: 'webtrader',
    icon: <FiMonitor size={24} />,
    name: 'Hokkai WebTrader',
    tagline: 'Browser-Based. No Downloads Required.',
    desc: 'A powerful, fully-featured trading platform accessible directly from your browser. No installation needed — just log in and start trading instantly from any device.',
    features: [
      'Multi-Chart Layout',
      'Custom Indicators',
      'Real-Time Market Data',
      'Instant Order Execution',
      'One-Click Trading',
      'Advanced Drawing Tools',
      'Economic Calendar',
      'Risk Management Tools',
    ],
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    badge: 'Most Popular',
    badgeColor: 'bg-red-accent/20 text-red-accent',
  },
  {
    id: 'mobile',
    icon: <FiSmartphone size={24} />,
    name: 'Mobile Trading App',
    tagline: 'Trade Anytime, Anywhere.',
    desc: 'Full-featured mobile trading app for iOS and Android. Manage your account, monitor markets, and execute trades on the go with the same professional tools.',
    features: [
      'iOS & Android Compatible',
      'Full Account Management',
      'Push Notifications',
      'Secure Biometric Login',
      'Real-Time Charts',
      'One-Tap Trading',
      'Portfolio Overview',
      'Deposit & Withdrawal',
    ],
    color: 'text-green-accent',
    bg: 'bg-green-accent/10',
    border: 'border-green-accent/20',
    badge: 'iOS & Android',
    badgeColor: 'bg-green-accent/20 text-green-accent',
  },
  {
    id: 'desktop',
    icon: <FiCpu size={24} />,
    name: 'Desktop Terminal',
    tagline: 'Professional Trading Environment.',
    desc: 'Advanced desktop terminal for professional traders who demand the highest performance. Supports automated trading, API access, and VPS compatibility.',
    features: [
      'Automated Trading (EA)',
      'API Access',
      'VPS Compatibility',
      'Advanced Backtesting',
      'Custom Scripts',
      'Multi-Account Management',
      'Deep Market Analysis',
      'Algorithmic Trading',
    ],
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    badge: 'Pro Traders',
    badgeColor: 'bg-purple-400/20 text-purple-400',
  },
]

const platformComparison = [
  { feature: 'Real-Time Charts', webtrader: true, mobile: true, desktop: true },
  { feature: 'One-Click Trading', webtrader: true, mobile: true, desktop: true },
  { feature: 'Economic Calendar', webtrader: true, mobile: true, desktop: true },
  { feature: 'Custom Indicators', webtrader: true, mobile: false, desktop: true },
  { feature: 'Automated Trading', webtrader: false, mobile: false, desktop: true },
  { feature: 'API Access', webtrader: false, mobile: false, desktop: true },
  { feature: 'Push Notifications', webtrader: false, mobile: true, desktop: false },
  { feature: 'No Download Required', webtrader: true, mobile: false, desktop: false },
  { feature: 'Copy Trading', webtrader: true, mobile: true, desktop: true },
  { feature: 'VPS Compatible', webtrader: false, mobile: false, desktop: true },
]

function Platforms() {
  const [activePlatform, setActivePlatform] = useState('webtrader')
  const active = platforms.find(p => p.id === activePlatform)

  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiMonitor size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Trading Platforms</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Next-Generation <span className="text-red-gradient">Trading Platforms</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Choose from our suite of professional trading platforms — web, mobile, and desktop — all designed for speed, precision, and reliability.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Get Started <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline gap-2">
                Try Demo Free
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Platform Selector */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Platforms"
            title="Our Trading Platforms"
            highlight="Trading Platforms"
            subtitle="Professional tools for every type of trader — from beginners to institutional professionals."
          />

          {/* Platform Tabs */}
          <AnimatedSection animation="slideUp" delay={0.2} className="flex flex-wrap justify-center gap-3 mt-10 mb-12">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activePlatform === p.id
                    ? 'bg-red-accent text-white shadow-lg shadow-red-accent/20'
                    : 'bg-dark-600 text-gray-400 border border-white/5 hover:border-red-accent/20 hover:text-white'
                }`}
              >
                {p.icon}
                {p.name}
              </button>
            ))}
          </AnimatedSection>

          {/* Active Platform Detail */}
          {active && (
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Platform Image */}
              <AnimatedSection animation="slideLeft" key={`${activePlatform}-img`}>
                <div className="rounded-2xl overflow-hidden border border-white/5 aspect-video w-full">
                  <img
                    src={cardImage3}
                    alt="Trading Platform"
                    className="w-full h-full object-cover"
                  />
                </div>
              </AnimatedSection>

              {/* Right: Platform Info */}
              <AnimatedSection animation="slideRight" key={`${activePlatform}-info`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${active.bg} ${active.border} border mb-2`}>
                  <span className={active.color}>{active.icon}</span>
                  <span className={`text-sm font-semibold ${active.color}`}>{active.name}</span>
                </div>
                <span className={`ml-2 badge ${active.badgeColor}`}>{active.badge}</span>

                <h2 className="text-3xl font-bold text-white mt-4 mb-2">{active.name}</h2>
                <p className={`font-semibold mb-3 ${active.color}`}>{active.tagline}</p>
                <p className="text-gray-400 mb-6 leading-relaxed">{active.desc}</p>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  {active.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <FiCheck size={13} className="text-red-accent flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Link to="/accounts" className="btn-primary gap-2">
                    Launch Platform <FiArrowRight size={16} />
                  </Link>
                  <Link to="/accounts" className="btn-secondary gap-2">
                    Try Demo
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          )}
        </div>
      </section>

      {/* Platform Comparison Table */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Compare"
            title="Platform Comparison"
            highlight="Comparison"
            subtitle="Find the right platform for your trading style."
          />
          <AnimatedSection animation="slideUp" delay={0.2} className="mt-10 overflow-x-auto">
            <div className="bg-dark-600 rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-700">
                    <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider py-4 px-6">Feature</th>
                    <th className="text-center text-xs font-semibold text-blue-400 uppercase tracking-wider py-4 px-4">WebTrader</th>
                    <th className="text-center text-xs font-semibold text-green-accent uppercase tracking-wider py-4 px-4">Mobile App</th>
                    <th className="text-center text-xs font-semibold text-purple-400 uppercase tracking-wider py-4 px-4">Desktop</th>
                  </tr>
                </thead>
                <tbody>
                  {platformComparison.map((row, i) => (
                    <tr key={row.feature} className={`border-t border-white/5 ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                      <td className="py-3 px-6 text-sm text-gray-300">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        {row.webtrader
                          ? <span className="text-green-accent text-lg">✓</span>
                          : <span className="text-gray-600 text-lg">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.mobile
                          ? <span className="text-green-accent text-lg">✓</span>
                          : <span className="text-gray-600 text-lg">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.desktop
                          ? <span className="text-green-accent text-lg">✓</span>
                          : <span className="text-gray-600 text-lg">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Copy Trading */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionHeader
                badge="Copy Trading"
                title="Copy Trading Integration"
                highlight="Copy Trading"
                subtitle="Follow and automatically copy the trades of experienced traders. Perfect for beginners or those who want a passive trading approach."
                align="left"
              />
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  { icon: '👥', title: 'Follow Top Traders', desc: 'Browse verified trader profiles' },
                  { icon: '⚡', title: 'Auto-Copy Trades', desc: 'Instant trade replication' },
                  { icon: '📊', title: 'Performance Stats', desc: 'Full transparency & history' },
                  { icon: '🛡', title: 'Risk Controls', desc: 'Set your own risk limits' },
                ].map((item) => (
                  <AnimatedSection key={item.title} animation="slideUp">
                    <div className="p-4 rounded-xl bg-dark-600 border border-white/5 hover:border-red-accent/20 transition-all duration-300">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                      <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
              <AnimatedSection animation="slideUp" delay={0.4} className="mt-6">
                <Link to="/accounts" className="btn-primary gap-2">
                  Start Copy Trading <FiArrowRight size={16} />
                </Link>
              </AnimatedSection>
            </div>
            {/* Empty image container */}
            <AnimatedSection animation="slideRight" delay={0.2}>
              <div className="rounded-2xl bg-dark-600/50 border border-white/5 aspect-square w-full max-w-md mx-auto">
                {/* Intentionally empty image container */}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-800">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start Trading on Your <span className="text-red-gradient">Preferred Platform</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              All platforms are available with a free demo account. No risk, no commitment.
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

export default Platforms
