// ============================================
// HOKKAI MARKETS - Terms & Conditions Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiFileText, FiArrowRight } from 'react-icons/fi'
import AnimatedSection, { PageTransition } from '../../components/AnimatedSection'
import MarketTicker from '../../components/MarketTicker'

const obligations = [
  'Provide accurate, complete, and up-to-date personal information',
  'Comply with all applicable trading rules and platform guidelines',
  'Understand and accept the risks associated with leveraged trading',
  'Follow all AML/KYC policies and procedures',
  'Maintain the confidentiality of your account credentials',
  'Not engage in market manipulation, fraud, or abusive trading practices',
  'Ensure sufficient funds are available to cover margin requirements',
  'Promptly notify us of any unauthorized access to your account',
]

const sections = [
  {
    title: '1. Account Opening & Eligibility',
    content: `To open an account with Hokkai Markets, you must be at least 18 years of age and legally permitted to trade financial instruments in your jurisdiction. By submitting an account application, you confirm that you meet these eligibility requirements and that all information provided is accurate and complete.

We reserve the right to decline any account application at our sole discretion and without providing a reason.`,
  },
  {
    title: '2. Account Usage',
    content: `Your account is for your personal use only. You may not allow third parties to access or use your account. You are responsible for all activity that occurs under your account credentials. You must keep your login details confidential and notify us immediately if you suspect unauthorized access.`,
  },
  {
    title: '3. Trading Rules',
    content: `All trades are executed subject to our trading conditions, including applicable spreads, commissions, and margin requirements. We reserve the right to refuse, cancel, or reverse any trade that we reasonably believe was executed in error, in bad faith, or in violation of these Terms.

Scalping, hedging, and automated trading are permitted on ECN Raw and Pro accounts. Specific restrictions may apply to Standard accounts.`,
  },
  {
    title: '4. Deposits & Withdrawals',
    content: `All deposits must be made from accounts or payment methods registered in your name. We do not accept third-party deposits. Withdrawal requests are processed within 1-3 business days subject to verification requirements.

We reserve the right to request additional documentation before processing withdrawals to comply with our AML obligations.`,
  },
  {
    title: '5. Leverage & Margin',
    content: `Leverage is provided at our discretion and may be adjusted based on market conditions, account type, or regulatory requirements. You are responsible for monitoring your margin levels at all times. We may close positions without prior notice if your margin falls below the required level.`,
  },
  {
    title: '6. Account Suspension & Termination',
    content: `We reserve the right to suspend or terminate your account in cases of policy violations, suspected fraud, failure to complete KYC verification, or at our sole discretion with reasonable notice. Upon termination, any outstanding positions may be closed and remaining funds returned to you after deducting applicable fees.`,
  },
  {
    title: '7. Limitation of Liability',
    content: `Hokkai Markets shall not be liable for any losses arising from market conditions, technical failures, force majeure events, or actions taken in accordance with these Terms. Our total liability to you shall not exceed the funds held in your account at the time of the claim.`,
  },
  {
    title: '8. Governing Law',
    content: `These Terms and Conditions are governed by and construed in accordance with applicable laws. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the relevant courts or arbitration bodies as specified in our regulatory framework.`,
  },
]

function TermsConditions() {
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
              <FiFileText size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms & Conditions</h1>
            <p className="text-gray-400 text-lg">
              By opening an account with Hokkai Markets, you agree to be bound by these Terms and Conditions. Please read them carefully before proceeding.
            </p>
            <p className="text-gray-500 text-sm mt-3">Last updated: January 2025</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding bg-dark-900">
        <div className="section-container max-w-4xl">

          {/* Agreement Banner */}
          <AnimatedSection animation="slideUp">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-red-accent/5 border border-red-accent/20 mb-12">
              <FiFileText className="text-red-accent flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Agreement to Terms</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  By accessing our platform or opening an account, you confirm that you have read, understood, and agree
                  to be bound by these Terms and Conditions, our Privacy Policy, Risk Disclosure, and AML Policy.
                  If you do not agree, please do not use our services.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Client Obligations */}
          <AnimatedSection animation="slideUp" delay={0.1}>
            <h2 className="text-2xl font-bold text-white mb-4">Your Obligations</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              As a client of Hokkai Markets, you agree to the following obligations:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
              {obligations.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-dark-600 border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-red-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-accent"></div>
                  </div>
                  <span className="text-gray-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* Main Sections */}
          <AnimatedSection animation="slideUp" delay={0.2}>
            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.title} className="p-6 rounded-xl bg-dark-600 border border-white/5 hover:border-red-accent/10 transition-all duration-300">
                  <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}
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

export default TermsConditions
