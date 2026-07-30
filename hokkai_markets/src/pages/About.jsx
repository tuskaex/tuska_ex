// ============================================
// HOKKAI MARKETS - About Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight, FiCheck, FiShield, FiUsers,
  FiGlobe, FiTrendingUp, FiAward, FiHeart
} from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'
import cardImage7 from '../../img/card_image_7.png'

const values = [
  {
    icon: <FiShield size={22} />,
    title: 'Fair Trading Practices',
    desc: 'We operate with complete transparency and integrity. No conflicts of interest, no manipulation — just fair, honest trading conditions.',
    color: 'text-green-accent',
    bg: 'bg-green-accent/10',
  },
  {
    icon: <FiTrendingUp size={22} />,
    title: 'Advanced Technology',
    desc: 'We continuously invest in cutting-edge trading infrastructure to deliver the fastest execution and most reliable platform experience.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: <FiHeart size={22} />,
    title: 'Customer-Centric Support',
    desc: 'Our clients are at the heart of everything we do. We provide dedicated, multilingual support 24 hours a day, 5 days a week.',
    color: 'text-red-accent',
    bg: 'bg-red-accent/10',
  },
  {
    icon: <FiUsers size={22} />,
    title: 'Long-Term Relationships',
    desc: 'We build lasting partnerships with our clients by consistently delivering value, reliability, and professional service.',
    color: 'text-red-accent',
    bg: 'bg-red-accent/10',
  },
  {
    icon: <FiGlobe size={22} />,
    title: 'Global Reach',
    desc: 'Serving traders across multiple continents with localized support and globally competitive trading conditions.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    icon: <FiAward size={22} />,
    title: 'Innovation First',
    desc: 'We stay ahead of the curve by continuously developing new features, tools, and services that empower our traders.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
]

const milestones = [
  { year: '2018', title: 'Founded', desc: 'Hokkai Markets was established with a vision to democratize professional trading.' },
  { year: '2019', title: 'Platform Launch', desc: 'Launched our proprietary WebTrader platform with advanced charting capabilities.' },
  { year: '2020', title: 'Mobile App', desc: 'Released iOS and Android mobile trading apps for on-the-go trading.' },
  { year: '2021', title: 'ECN Expansion', desc: 'Expanded our ECN network with additional tier-1 liquidity providers.' },
  { year: '2022', title: 'Global Growth', desc: 'Expanded operations to serve traders across Asia, Europe, and the Middle East.' },
  { year: '2023', title: 'AI Integration', desc: 'Integrated AI-powered market analysis and trading signals into our platform.' },
  { year: '2024', title: 'Copy Trading', desc: 'Launched copy trading feature, enabling passive income for all account types.' },
]

const team = [
  { name: 'James Nakamura', role: 'Chief Executive Officer', desc: '15+ years in institutional trading and fintech leadership.' },
  { name: 'Sarah Chen', role: 'Chief Technology Officer', desc: 'Former senior engineer at leading global trading platforms.' },
  { name: 'Michael Torres', role: 'Head of Trading', desc: 'Veteran forex trader with deep expertise in market microstructure.' },
  { name: 'Aiko Yamamoto', role: 'Head of Client Relations', desc: 'Dedicated to delivering exceptional client experiences globally.' },
]

function About() {
  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-red-accent/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection animation="slideLeft">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
                <FiGlobe size={14} className="text-red-accent" />
                <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">About Hokkai Markets</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                A Global Broker Built for <span className="text-red-gradient">Modern Traders</span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Hokkai Markets is a global multi-asset brokerage focused on delivering professional trading solutions to retail and institutional traders worldwide.
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Our mission is to empower traders through innovation, transparency, and advanced trading technology. We believe every trader deserves access to institutional-grade tools and conditions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/accounts" className="btn-primary gap-2">
                  Start Trading <FiArrowRight size={16} />
                </Link>
                <Link to="/contact" className="btn-outline gap-2">
                  Contact Us
                </Link>
              </div>
            </AnimatedSection>

            {/* About Hero Image */}
            <AnimatedSection animation="slideRight" delay={0.2}>
              <div className="rounded-2xl overflow-hidden border border-white/5 aspect-square w-full max-w-md mx-auto">
                <img
                  src={cardImage7}
                  alt="About Hokkai Markets"
                  className="w-full h-full object-cover"
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <AnimatedSection animation="slideUp" className="max-w-4xl mx-auto text-center">
            <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-red-accent/10 to-dark-600 border border-red-accent/20">
              <div className="text-4xl mb-6">🎯</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                "To empower traders worldwide through innovation, transparency, and advanced trading technology — providing institutional-grade tools and conditions to every trader, regardless of their experience level."
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Core Values */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Our Values"
            title="What We Stand For"
            highlight="We Stand For"
            subtitle="Our core values guide every decision we make and every service we provide."
          />
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {values.map((value) => (
              <StaggerItem key={value.title}>
                <div className="card group h-full">
                  <div className={`feature-icon ${value.bg} ${value.color} mb-4`}>
                    {value.icon}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-red-accent transition-colors">
                    {value.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{value.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Company Timeline */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Our Journey"
            title="Company Milestones"
            highlight="Milestones"
            subtitle="From our founding to today — a journey of continuous growth and innovation."
          />

          <div className="max-w-3xl mx-auto mt-14 relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-red-accent/50 via-red-accent/20 to-transparent hidden md:block"></div>

            <div className="space-y-6">
              {milestones.map((m, i) => (
                <AnimatedSection key={m.year} animation="slideLeft" delay={i * 0.08}>
                  <div className="flex gap-6 items-start">
                    {/* Year bubble */}
                    <div className="w-16 h-16 rounded-2xl bg-red-accent/10 border border-red-accent/20 flex items-center justify-center flex-shrink-0 relative z-10">
                      <span className="text-red-accent font-bold text-sm">{m.year}</span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 p-4 rounded-xl bg-dark-600 border border-white/5 hover:border-red-accent/20 transition-all duration-300">
                      <h4 className="text-white font-semibold mb-1">{m.title}</h4>
                      <p className="text-gray-400 text-sm">{m.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Leadership"
            title="Our Leadership Team"
            highlight="Leadership Team"
            subtitle="Experienced professionals dedicated to delivering the best trading experience."
          />

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {team.map((member) => (
              <StaggerItem key={member.name}>
                <div className="card group text-center hover:border-red-accent/30">
                  {/* Empty avatar container */}
                  <div className="w-20 h-20 rounded-2xl bg-dark-500 border border-white/5 mx-auto mb-4">
                    {/* Intentionally empty image container */}
                  </div>
                  <h3 className="text-white font-semibold mb-1 group-hover:text-red-accent transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-red-accent text-xs font-semibold mb-2">{member.role}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{member.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Legal & Compliance */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Legal"
            title="Legal & Compliance"
            highlight="Compliance"
            subtitle="We operate with the highest standards of regulatory compliance and client protection."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {[
              {
                title: 'Risk Disclosure',
                desc: 'Trading leveraged products carries a high level of risk and may not be suitable for all investors. You may lose more than your initial investment.',
                icon: '⚠️',
              },
              {
                title: 'Privacy Policy',
                desc: 'We are committed to protecting your personal data. All information is handled in accordance with applicable data protection regulations.',
                icon: '🔒',
              },
              {
                title: 'Terms & Conditions',
                desc: 'Our terms and conditions govern the use of our services and trading platforms. Please read them carefully before opening an account.',
                icon: '📋',
              },
            ].map((item, i) => (
              <AnimatedSection key={item.title} animation="slideUp" delay={i * 0.1}>
                <div className="card h-full">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-white font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{item.desc}</p>
                  <button className="text-red-accent text-xs font-semibold hover:text-red-light transition-colors">
                    Read Full Document →
                  </button>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Risk Warning */}
          <AnimatedSection animation="slideUp" delay={0.3} className="mt-8">
            <div className="p-5 rounded-xl bg-red-accent/5 border border-red-accent/10">
              <p className="text-xs text-gray-400 leading-relaxed text-center">
                <span className="text-red-accent font-semibold">Risk Warning: </span>
                Trading leveraged products such as Forex and CFDs carries a high level of risk and may not be suitable for all investors. 
                The high degree of leverage can work against you as well as for you. Before deciding to trade, you should carefully consider 
                your investment objectives, level of experience, and risk appetite. The possibility exists that you could sustain a loss of 
                some or all of your initial investment. Past performance is not indicative of future results.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-900">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Join the <span className="text-red-gradient">Hokkai Markets</span> Community
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Thousands of traders worldwide trust Hokkai Markets for professional-grade execution and transparent conditions.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Open Account <FiArrowRight size={16} />
              </Link>
              <Link to="/contact" className="btn-secondary gap-2">
                Contact Our Team
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default About
