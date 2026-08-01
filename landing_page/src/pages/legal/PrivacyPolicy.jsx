// ============================================
// HOKKAI MARKETS - Privacy Policy Page
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import { FiLock, FiArrowRight } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../../components/AnimatedSection'
import MarketTicker from '../../components/MarketTicker'

const dataUses = [
  { title: 'Account Verification', desc: 'To verify your identity and comply with KYC/AML regulatory requirements.' },
  { title: 'Regulatory Compliance', desc: 'To meet our legal and regulatory obligations as a licensed brokerage.' },
  { title: 'Service Improvement', desc: 'To enhance our platforms, tools, and overall trading experience.' },
  { title: 'Security Monitoring', desc: 'To detect, prevent, and respond to fraud, abuse, and security threats.' },
  { title: 'Communication', desc: 'To send account notifications, updates, and relevant market information.' },
  { title: 'Customer Support', desc: 'To provide assistance and resolve any issues related to your account.' },
]

function PrivacyPolicy() {
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
              <FiLock size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-gray-400 text-lg">
              Hokkai Markets is committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information.
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
              <FiLock className="text-red-accent flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Our Privacy Commitment</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  All client data is encrypted and securely stored. We do not sell or share personal data with unauthorized
                  third parties. Your privacy is fundamental to our operations and we handle all personal information with
                  the utmost care and in accordance with applicable data protection regulations.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* How We Use Data */}
          <AnimatedSection animation="slideUp" delay={0.1}>
            <h2 className="text-2xl font-bold text-white mb-6">1. How We Use Your Data</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              We collect personal information only for legitimate business purposes. The following outlines the primary
              reasons we collect and process your personal data:
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {dataUses.map((item) => (
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

          {/* Additional Sections */}
          <AnimatedSection animation="slideUp" delay={0.2}>
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">2. Data We Collect</h2>
                <p className="text-gray-400 leading-relaxed mb-3">
                  We may collect the following categories of personal information:
                </p>
                <ul className="space-y-2">
                  {[
                    'Personal identification information (name, date of birth, nationality)',
                    'Contact information (email address, phone number, residential address)',
                    'Financial information (bank details, trading history, account balances)',
                    'Identity verification documents (passport, national ID, proof of address)',
                    'Device and usage data (IP address, browser type, pages visited)',
                    'Communication records (emails, chat logs, support tickets)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-400 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-accent flex-shrink-0 mt-1.5"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
                <p className="text-gray-400 leading-relaxed">
                  We implement industry-standard security measures to protect your personal data, including 256-bit SSL
                  encryption, secure data storage, access controls, and regular security audits. All data transmissions
                  between your device and our servers are encrypted.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing</h2>
                <p className="text-gray-400 leading-relaxed">
                  We do not sell, rent, or share your personal data with unauthorized third parties. We may share data
                  with regulatory authorities as required by law, with payment processors to facilitate transactions,
                  and with service providers who assist in our operations under strict confidentiality agreements.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention</h2>
                <p className="text-gray-400 leading-relaxed">
                  We retain your personal data for as long as your account is active and for a period thereafter as
                  required by applicable laws and regulations. You may request deletion of your data subject to our
                  legal retention obligations.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
                <p className="text-gray-400 leading-relaxed mb-3">
                  Depending on your jurisdiction, you may have the following rights regarding your personal data:
                </p>
                <ul className="space-y-2">
                  {[
                    'Right to access your personal data',
                    'Right to correct inaccurate data',
                    'Right to request deletion of your data',
                    'Right to restrict processing of your data',
                    'Right to data portability',
                    'Right to object to processing',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-400 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-accent flex-shrink-0 mt-1.5"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">7. Contact Us</h2>
                <p className="text-gray-400 leading-relaxed">
                  If you have any questions about this Privacy Policy or wish to exercise your data rights, please
                  contact our Data Protection team at{' '}
                  <a href="mailto:support@hokkaimarkets.com" className="text-red-accent hover:text-red-light transition-colors">
                    support@hokkaimarkets.com
                  </a>.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection animation="slideUp" delay={0.3} className="mt-12">
            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="btn-primary gap-2">
                Contact Us <FiArrowRight size={16} />
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

export default PrivacyPolicy
