// ============================================
// HOKKAI MARKETS - Risk Disclosure Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiArrowRight, FiShield } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../../components/AnimatedSection'
import MarketTicker from '../../components/MarketTicker'

const riskFactors = [
  {
    title: 'Market Volatility',
    desc: 'Financial markets can be highly volatile. Prices can move rapidly and unpredictably, resulting in significant gains or losses within short periods.',
  },
  {
    title: 'Leverage Risks',
    desc: 'Leveraged trading amplifies both profits and losses. A small adverse price movement can result in losses exceeding your initial deposit.',
  },
  {
    title: 'Margin Requirements',
    desc: 'You must maintain sufficient margin in your account. Failure to meet margin calls may result in the automatic closure of your positions.',
  },
  {
    title: 'Liquidity Risks',
    desc: 'Under certain market conditions, it may be difficult or impossible to execute orders at the desired price, particularly during major news events.',
  },
  {
    title: 'Technology Risks',
    desc: 'Electronic trading systems are subject to technical failures, internet disruptions, and other technology-related risks that may affect order execution.',
  },
  {
    title: 'Currency Risk',
    desc: 'If your account currency differs from the instrument currency, exchange rate fluctuations may affect your profit and loss.',
  },
]

function RiskDisclosure() {
  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-16 hero-bg grid-bg overflow-hidden">
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiAlertTriangle size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Risk Disclosure</h1>
            <p className="text-gray-400 text-lg">
              Trading leveraged financial products carries a high level of risk and may not be suitable for all investors. Please read this disclosure carefully before trading.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding bg-dark-900">
        <div className="section-container max-w-4xl">

          {/* Warning Banner */}
          <AnimatedSection animation="slideUp">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-red-accent/5 border border-red-accent/20 mb-12">
              <FiAlertTriangle className="text-red-accent flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Important Risk Warning</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Trading leveraged financial products carries a high level of risk and may not be suitable for all investors.
                  You may lose more than your initial investment. Hokkai Markets does not guarantee profits and does not provide
                  investment advice. Before trading, ensure you fully understand the risks involved.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Introduction */}
          <AnimatedSection animation="slideUp" delay={0.1}>
            <div className="prose-dark mb-10">
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                This Risk Disclosure Statement is provided to you by Hokkai Markets in accordance with our regulatory obligations.
                It is intended to inform you of the risks associated with trading leveraged financial instruments including but not
                limited to Forex, CFDs, indices, commodities, stocks, and cryptocurrencies.
              </p>
              <p className="text-gray-400 leading-relaxed">
                This document does not disclose all risks associated with trading. You should not trade unless you understand the
                nature of the products you are trading and the extent of your exposure to risk.
              </p>
            </div>
          </AnimatedSection>

          {/* Risk Factors */}
          <AnimatedSection animation="slideUp" delay={0.15}>
            <h2 className="text-2xl font-bold text-white mb-6">2. Key Risk Factors</h2>
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {riskFactors.map((risk, i) => (
              <StaggerItem key={risk.title}>
                <div className="p-5 rounded-xl bg-dark-600 border border-white/5 hover:border-red-accent/20 transition-all duration-300 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-accent flex-shrink-0"></div>
                    <h4 className="text-white font-semibold text-sm">{risk.title}</h4>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{risk.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Additional Sections */}
          <AnimatedSection animation="slideUp" delay={0.2}>
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. No Investment Advice</h2>
                <p className="text-gray-400 leading-relaxed">
                  Hokkai Markets does not provide investment advice. Any information, analysis, or trading signals provided
                  through our platforms or communications are for informational purposes only and should not be construed as
                  investment advice. You are solely responsible for your trading decisions.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Past Performance</h2>
                <p className="text-gray-400 leading-relaxed">
                  Past performance of any financial instrument is not indicative of future results. Historical data and
                  performance records should not be relied upon as a guarantee of future performance.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. Suitability</h2>
                <p className="text-gray-400 leading-relaxed">
                  Before trading, you should carefully consider your investment objectives, level of experience, and risk
                  appetite. If you are unsure whether trading is appropriate for you, we recommend seeking independent
                  financial advice from a qualified professional.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Acknowledgement</h2>
                <p className="text-gray-400 leading-relaxed">
                  By opening an account with Hokkai Markets, you acknowledge that you have read, understood, and accepted
                  this Risk Disclosure Statement. You confirm that you are aware of the risks involved in trading leveraged
                  financial products.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection animation="slideUp" delay={0.3} className="mt-12">
            <div className="flex flex-wrap gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Open Account <FiArrowRight size={16} />
              </Link>
              <Link to="/contact" className="btn-secondary gap-2">
                Contact Us
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default RiskDisclosure
