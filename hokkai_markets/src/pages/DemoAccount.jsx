// ============================================
// HOKKAI MARKETS - Demo Account Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiPlay, FiCheck, FiMonitor, FiTrendingUp, FiShield } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'

const benefits = [
  {
    icon: <FiMonitor size={22} />,
    title: 'Real-Time Market Data',
    desc: 'Experience live market prices and conditions using virtual funds — identical to a live account.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: <FiTrendingUp size={22} />,
    title: 'Full Platform Access',
    desc: 'Access all trading tools, charts, indicators, and order types available on our live platform.',
    color: 'text-red-accent',
    bg: 'bg-red-accent/10',
  },
  {
    icon: <FiShield size={22} />,
    title: 'Risk-Free Environment',
    desc: 'Practice trading strategies without risking real capital. Perfect for beginners and experienced traders testing new approaches.',
    color: 'text-green-accent',
    bg: 'bg-green-accent/10',
  },
  {
    icon: <FiPlay size={22} />,
    title: 'Instant Activation',
    desc: 'Your demo account is activated instantly. No deposit required — start trading in minutes.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
]

const steps = [
  { step: '01', title: 'Register', desc: 'Fill in your name and email to create your free demo account.' },
  { step: '02', title: 'Activate', desc: 'Receive instant access — no verification or deposit required.' },
  { step: '03', title: 'Practice', desc: 'Trade with virtual funds across 60+ instruments in real market conditions.' },
  { step: '04', title: 'Go Live', desc: 'When ready, upgrade to a live account and start trading with real capital.' },
]

function DemoAccount() {
  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-red-accent/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiPlay size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Demo Account</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Practice Before <span className="text-red-gradient">You Trade</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Our demo account allows you to experience real market conditions using virtual funds — completely risk-free. Ideal for beginners and traders testing new strategies.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary gap-2">
                Open Demo Account <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline gap-2">
                View Live Accounts
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Benefits"
            title="Why Use a Demo Account?"
            highlight="Demo Account"
            subtitle="Everything you need to practice trading without any financial risk."
          />
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14">
            {benefits.map((item) => (
              <StaggerItem key={item.title}>
                <div className="card group h-full flex gap-4">
                  <div className={`feature-icon ${item.bg} ${item.color} flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-red-light transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How to Open */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Get Started"
            title="How to Open a Demo Account"
            highlight="Demo Account"
            subtitle="Get started in minutes — no deposit, no risk, no commitment."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14 relative">
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
        </div>
      </section>

      {/* Features List */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection animation="slideLeft">
              <SectionHeader
                badge="Features"
                title="What's Included in Your Demo"
                highlight="Demo"
                subtitle="Your demo account comes fully loaded with all the tools available on a live account."
                align="left"
              />
              <div className="space-y-3 mt-8">
                {[
                  'Real-time market data across 60+ instruments',
                  'Full access to all trading platforms (Web, Mobile, Desktop)',
                  'Advanced charting with 50+ technical indicators',
                  'All order types: Market, Limit, Stop, Trailing Stop',
                  'Risk management tools and calculators',
                  'Economic calendar and market news',
                  'No financial risk involved',
                  'Ideal for beginners and strategy testing',
                ].map((item, i) => (
                  <AnimatedSection key={i} animation="slideLeft" delay={i * 0.05}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-600/50 border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-red-accent/20 flex items-center justify-center flex-shrink-0">
                        <FiCheck size={11} className="text-red-accent" />
                      </div>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection animation="slideRight" delay={0.2}>
              <div className="p-8 rounded-2xl bg-gradient-to-br from-red-accent/10 to-dark-600 border border-red-accent/20">
                <div className="text-center mb-8">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Ready to Start?</h3>
                  <p className="text-gray-400 text-sm">Open your free demo account in under 2 minutes.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Virtual Funds</span>
                    <span className="text-white font-semibold text-sm">$10,000</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Instruments</span>
                    <span className="text-white font-semibold text-sm">60+</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Deposit Required</span>
                    <span className="text-green-accent font-semibold text-sm">None</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">Activation</span>
                    <span className="text-green-accent font-semibold text-sm">Instant</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400 text-sm">Financial Risk</span>
                    <span className="text-green-accent font-semibold text-sm">Zero</span>
                  </div>
                </div>
                <Link to="/contact" className="btn-primary w-full text-center mt-6 gap-2 justify-center">
                  Open Free Demo <FiArrowRight size={16} />
                </Link>
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
              No Risk. <span className="text-red-gradient">No Commitment.</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Start practicing with a free demo account today and build the confidence to trade live markets.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary gap-2">
                Open Demo Account <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-secondary gap-2">
                View Live Accounts
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default DemoAccount
