// ============================================
// HOKKAI MARKETS - AML Policy Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiShield, FiArrowRight } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../../components/AnimatedSection'
import MarketTicker from '../../components/MarketTicker'

const kycRequirements = [
  { title: 'Government-Issued Photo ID', desc: 'Valid passport, national identity card, or driver\'s license.' },
  { title: 'Proof of Address', desc: 'Utility bill, bank statement, or official document dated within 3 months.' },
  { title: 'Source of Funds', desc: 'Documentation confirming the legitimate origin of funds used for trading.' },
  { title: 'Enhanced Due Diligence', desc: 'Additional documentation may be required for high-risk clients or large transactions.' },
]

const redFlags = [
  'Unusually large cash deposits or withdrawals',
  'Transactions inconsistent with the client\'s stated profile',
  'Requests to transfer funds to unrelated third parties',
  'Reluctance to provide required identification documents',
  'Multiple accounts with similar trading patterns',
  'Transactions from high-risk jurisdictions',
]

function AmlPolicy() {
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
              <FiShield size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AML Policy</h1>
            <p className="text-gray-400 text-lg">
              Hokkai Markets strictly follows Anti-Money Laundering (AML) regulations and is committed to preventing financial crime across all operations.
            </p>
            <p className="text-gray-500 text-sm mt-3">Last updated: January 2025</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding bg-dark-900">
        <div className="section-container max-w-4xl">

          {/* Commitment Banner */}
          <AnimatedSection animation="slideUp">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-red-accent/5 border border-red-accent/20 mb-12">
              <FiShield className="text-red-accent flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Our AML Commitment</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Hokkai Markets maintains a zero-tolerance policy toward money laundering, terrorist financing, and
                  other financial crimes. We are committed to full compliance with all applicable AML laws and regulations.
                  Any suspicious activity will be reported to relevant authorities in accordance with applicable laws.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Introduction */}
          <AnimatedSection animation="slideUp" delay={0.1}>
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                <p className="text-gray-400 leading-relaxed">
                  This Anti-Money Laundering (AML) Policy outlines the procedures and controls implemented by Hokkai Markets
                  to prevent, detect, and report money laundering and terrorist financing activities. This policy applies to
                  all clients, employees, and business relationships.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. Know Your Customer (KYC)</h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  All clients are required to complete our KYC verification process before trading. We require the following documentation:
                </p>
              </div>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {kycRequirements.map((item) => (
              <StaggerItem key={item.title}>
                <div className="p-5 rounded-xl bg-dark-600 border border-white/5 hover:border-red-accent/20 transition-all duration-300 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-accent flex-shrink-0"></div>
                    <h4 className="text-white font-semibold text-sm">{item.title}</h4>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <AnimatedSection animation="slideUp" delay={0.2}>
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. Transaction Monitoring</h2>
                <p className="text-gray-400 leading-relaxed">
                  We continuously monitor all client transactions for suspicious activity. Our compliance team reviews
                  transactions that deviate from normal patterns or that exceed defined thresholds. Automated systems
                  flag unusual activity for manual review by our compliance officers.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Suspicious Activity Indicators</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  The following are examples of activities that may trigger enhanced scrutiny or reporting:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {redFlags.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-dark-600 border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-red-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-accent"></div>
                      </div>
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. Reporting Obligations</h2>
                <p className="text-gray-400 leading-relaxed">
                  Where we have reasonable grounds to suspect money laundering or terrorist financing, we are legally
                  obligated to file a Suspicious Activity Report (SAR) with the relevant financial intelligence unit.
                  We are prohibited by law from disclosing to the client that a report has been made (tipping off).
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Account Restrictions</h2>
                <p className="text-gray-400 leading-relaxed">
                  We reserve the right to restrict, suspend, or terminate any account where we have concerns about
                  AML compliance. In such cases, we may freeze funds pending investigation and cooperate fully with
                  law enforcement and regulatory authorities.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Employee Training</h2>
                <p className="text-gray-400 leading-relaxed">
                  All Hokkai Markets employees receive regular AML training to ensure they can identify and report
                  suspicious activity. Our compliance team undergoes specialized training and stays current with
                  evolving AML regulations and best practices.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection animation="slideUp" delay={0.3} className="mt-12">
            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="btn-primary gap-2">
                Contact Compliance <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-secondary gap-2">
                Open Account
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default AmlPolicy
