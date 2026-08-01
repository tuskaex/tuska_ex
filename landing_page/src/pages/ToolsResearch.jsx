// ============================================
// HOKKAI MARKETS - Tools & Research Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight, FiBarChart2, FiCalendar, FiTrendingUp,
  FiCpu, FiTool, FiServer, FiActivity, FiTarget
} from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'
import cardImage6 from '../../img/card_image_6.png'

const tools = [
  {
    icon: <FiBarChart2 size={22} />,
    title: 'Daily Market Analysis',
    desc: 'In-depth daily analysis of major markets including forex, indices, commodities, and crypto. Written by our team of professional analysts.',
    features: ['Morning briefings', 'Technical analysis', 'Fundamental outlook', 'Key levels & targets'],
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    badge: 'Daily',
  },
  {
    icon: <FiTrendingUp size={22} />,
    title: 'Technical Reports',
    desc: 'Comprehensive technical analysis reports covering chart patterns, support/resistance levels, and trend analysis across all asset classes.',
    features: ['Chart pattern analysis', 'Support & resistance', 'Trend identification', 'Entry & exit signals'],
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    badge: 'Weekly',
  },
  {
    icon: <FiTarget size={22} />,
    title: 'Trading Signals',
    desc: 'Professional trading signals with clear entry, stop-loss, and take-profit levels. Delivered directly to your platform or mobile app.',
    features: ['Entry price alerts', 'Stop-loss levels', 'Take-profit targets', 'Risk/reward ratios'],
    color: 'text-red-accent',
    bg: 'bg-red-accent/10',
    badge: 'Real-time',
  },
  {
    icon: <FiCpu size={22} />,
    title: 'AI Market Insights',
    desc: 'Cutting-edge AI-powered market analysis that processes thousands of data points to identify trading opportunities and market trends.',
    features: ['Pattern recognition', 'Sentiment analysis', 'Predictive modeling', 'Automated alerts'],
    color: 'text-green-accent',
    bg: 'bg-green-accent/10',
    badge: 'AI-Powered',
  },
  {
    icon: <FiTool size={22} />,
    title: 'Risk Calculator',
    desc: 'Professional risk management calculator to help you determine optimal position sizes, risk per trade, and potential profit/loss scenarios.',
    features: ['Position size calculator', 'Pip value calculator', 'Margin calculator', 'Risk/reward tool'],
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    badge: 'Free Tool',
  },
  {
    icon: <FiCalendar size={22} />,
    title: 'Economic Calendar',
    desc: 'Comprehensive economic calendar with real-time updates on major economic events, central bank decisions, and market-moving data releases.',
    features: ['Real-time updates', 'Impact ratings', 'Historical data', 'Custom filters'],
    color: 'text-red-accent',
    bg: 'bg-red-accent/10',
    badge: 'Live',
  },
  {
    icon: <FiServer size={22} />,
    title: 'VPS Hosting',
    desc: 'Ultra-low latency VPS hosting co-located with our trading servers. Ideal for automated trading strategies and Expert Advisors.',
    features: ['Ultra-low latency', 'Co-located servers', '99.9% uptime', '24/7 monitoring'],
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    badge: 'Premium',
  },
  {
    icon: <FiActivity size={22} />,
    title: 'Market Sentiment',
    desc: 'Real-time market sentiment data showing the positioning of retail and institutional traders across major instruments.',
    features: ['Long/short ratios', 'Institutional flow', 'Retail sentiment', 'Contrarian signals'],
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    badge: 'Real-time',
  },
]

// Sample economic calendar events
const calendarEvents = [
  { time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', impact: 'high', forecast: '185K', previous: '199K' },
  { time: '10:00', currency: 'EUR', event: 'ECB Interest Rate Decision', impact: 'high', forecast: '4.50%', previous: '4.50%' },
  { time: '13:30', currency: 'GBP', event: 'UK CPI (YoY)', impact: 'medium', forecast: '3.9%', previous: '4.0%' },
  { time: '15:00', currency: 'USD', event: 'ISM Manufacturing PMI', impact: 'medium', forecast: '47.5', previous: '47.4' },
  { time: '19:00', currency: 'USD', event: 'FOMC Meeting Minutes', impact: 'high', forecast: '—', previous: '—' },
]

const impactColors = {
  high: 'bg-red-accent/20 text-red-accent',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-accent/20 text-green-accent',
}

function ToolsResearch() {
  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiTool size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Tools & Research</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Professional <span className="text-red-gradient">Trading Tools</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Equip yourself with institutional-grade research, AI-powered insights, and professional trading tools to gain a competitive edge in the markets.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Access All Tools <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline gap-2">
                Open Free Demo
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Tools"
            title="Research & Analysis Tools"
            highlight="Research & Analysis"
            subtitle="Everything you need to make informed trading decisions — all in one place."
          />
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {tools.map((tool) => (
              <StaggerItem key={tool.title}>
                <div className="card group h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`feature-icon ${tool.bg} ${tool.color}`}>
                      {tool.icon}
                    </div>
                    <span className={`badge text-xs ${tool.bg} ${tool.color}`}>{tool.badge}</span>
                  </div>
                  <h3 className="text-white font-semibold text-base mb-2 group-hover:text-red-light transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed mb-4 flex-1">{tool.desc}</p>
                  <ul className="space-y-1">
                    {tool.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-1 h-1 rounded-full bg-red-accent flex-shrink-0"></div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Economic Calendar Preview */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Economic Calendar"
            title="Economic Calendar"
            highlight="Economic Calendar"
            subtitle="Stay ahead of market-moving events with our real-time economic calendar."
          />
          <AnimatedSection animation="slideUp" delay={0.2} className="mt-10">
            <div className="bg-dark-600 rounded-2xl border border-white/5 overflow-hidden">
              {/* Calendar header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-dark-700">
                <div className="flex items-center gap-3">
                  <FiCalendar className="text-red-accent" size={16} />
                  <span className="text-white font-semibold text-sm">Upcoming Events</span>
                </div>
                <div className="flex gap-2">
                  {['All', 'High', 'Medium', 'Low'].map((filter) => (
                    <button key={filter} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'All' ? 'bg-red-accent/20 text-red-accent' : 'text-gray-400 hover:text-white'
                    }`}>
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar events */}
              <div className="divide-y divide-white/5">
                {calendarEvents.map((event, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-white/2 transition-colors">
                    <div className="text-gray-400 text-xs font-mono w-12 flex-shrink-0">{event.time}</div>
                    <div className="w-10 h-6 rounded bg-dark-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{event.currency}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm font-medium truncate block">{event.event}</span>
                    </div>
                    <span className={`badge text-xs flex-shrink-0 ${impactColors[event.impact]}`}>
                      {event.impact}
                    </span>
                    <div className="hidden md:flex gap-6 text-xs flex-shrink-0">
                      <div className="text-center">
                        <div className="text-gray-500 mb-0.5">Forecast</div>
                        <div className="text-white font-mono">{event.forecast}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500 mb-0.5">Previous</div>
                        <div className="text-gray-300 font-mono">{event.previous}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-white/5 text-center">
                <Link to="/accounts" className="text-red-accent text-sm hover:text-red-light transition-colors">
                  View Full Calendar →
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* VPS Hosting */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* VPS Hosting Image */}
            <AnimatedSection animation="slideLeft">
              <div className="rounded-2xl overflow-hidden border border-white/5 aspect-video w-full">
                <img
                  src={cardImage6}
                  alt="VPS Hosting"
                  className="w-full h-full object-cover"
                />
              </div>
            </AnimatedSection>

            <div>
              <SectionHeader
                badge="VPS Hosting"
                title="Ultra-Low Latency VPS Hosting"
                highlight="VPS Hosting"
                subtitle="Co-located with our trading servers for the fastest possible execution of automated strategies."
                align="left"
              />
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  { icon: '⚡', title: 'Ultra-Low Latency', desc: 'Sub-millisecond connection' },
                  { icon: '🏢', title: 'Co-located Servers', desc: 'Same data center as our servers' },
                  { icon: '🔒', title: '99.9% Uptime', desc: 'Guaranteed server availability' },
                  { icon: '🛡', title: '24/7 Monitoring', desc: 'Continuous server monitoring' },
                ].map((item) => (
                  <AnimatedSection key={item.title} animation="slideRight">
                    <div className="p-4 rounded-xl bg-dark-600 border border-white/5 hover:border-cyan-400/20 transition-all duration-300">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                      <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
              <AnimatedSection animation="slideUp" delay={0.4} className="mt-6">
                <Link to="/contact" className="btn-primary gap-2">
                  Get VPS Hosting <FiArrowRight size={16} />
                </Link>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-800">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Access All Tools with a <span className="text-red-gradient">Live Account</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              All research tools, signals, and analysis are available free with any live trading account.
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

export default ToolsResearch
