// ============================================
// HOKKAI MARKETS - Contact Page
// ============================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiMail, FiMessageCircle, FiPhone, FiGlobe,
  FiArrowRight, FiCheck, FiSend, FiUser,
  FiMapPin, FiClock
} from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'

const contactMethods = [
  {
    icon: <FiMail size={22} />,
    title: 'Email Support',
    value: 'support@hokkaimarkets.com',
    desc: 'We respond within 2 business hours',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    action: 'mailto:support@hokkaimarkets.com',
    actionLabel: 'Send Email',
  },
  {
    icon: <FiMessageCircle size={22} />,
    title: 'Live Chat',
    value: 'Available 24/5',
    desc: 'Instant support from our team',
    color: 'text-green-accent',
    bg: 'bg-green-accent/10',
    border: 'border-green-accent/20',
    action: '#',
    actionLabel: 'Start Chat',
  },
  {
    icon: <FiPhone size={22} />,
    title: 'Phone Support',
    value: '+1 (800) HOKKAI-1',
    desc: 'Mon–Fri, 8:00 AM – 8:00 PM GMT',
    color: 'text-gold-500',
    bg: 'bg-gold-500/10',
    border: 'border-gold-500/20',
    action: 'tel:+18004655241',
    actionLabel: 'Call Now',
  },
]

const offices = [
  {
    city: 'Tokyo',
    country: 'Japan',
    address: '1-1 Marunouchi, Chiyoda-ku, Tokyo',
    flag: '🇯🇵',
    type: 'Headquarters',
  },
  {
    city: 'London',
    country: 'United Kingdom',
    address: '30 St Mary Axe, London, EC3A 8BF',
    flag: '🇬🇧',
    type: 'European Office',
  },
  {
    city: 'Dubai',
    country: 'UAE',
    address: 'DIFC, Gate District, Dubai',
    flag: '🇦🇪',
    type: 'MENA Office',
  },
]

const faqItems = [
  { q: 'How long does account verification take?', a: 'Account verification typically takes 1-2 business hours during working hours. You will receive an email confirmation once your account is verified.' },
  { q: 'What documents are required for verification?', a: 'You will need a government-issued photo ID (passport or national ID) and a proof of address document (utility bill or bank statement) dated within the last 3 months.' },
  { q: 'How can I deposit funds?', a: 'We accept bank transfers, credit/debit cards (Visa/Mastercard), and major e-wallets. All deposits are processed instantly or within 1 business day.' },
  { q: 'How long do withdrawals take?', a: 'Withdrawals are processed within 24 hours on business days. The time to receive funds depends on your payment method (1-5 business days for bank transfers).' },
]

function Contact() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    country: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Simulate form submission
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
    setFormData({ fullName: '', email: '', country: '', subject: '', message: '' })
  }

  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20 mb-6">
              <FiMail size={14} className="text-gold-400" />
              <span className="text-gold-400 text-xs font-semibold uppercase tracking-wider">Contact Us</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              We're Here to <span className="text-gold-gradient">Help You</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Our dedicated support team is available 24/5 to assist you with any questions about trading, accounts, or our platform.
            </p>
            {/* Support hours badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-accent/10 border border-green-accent/20">
              <div className="w-2 h-2 rounded-full bg-green-accent animate-pulse"></div>
              <span className="text-green-accent text-sm font-medium">Support Online — Average response: under 2 hours</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactMethods.map((method) => (
              <StaggerItem key={method.title}>
                <div className={`card group h-full border ${method.border} hover:shadow-lg transition-all duration-300`}>
                  <div className={`feature-icon ${method.bg} ${method.color} mb-4`}>
                    {method.icon}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-gold-400 transition-colors">
                    {method.title}
                  </h3>
                  <p className={`font-semibold mb-1 ${method.color}`}>{method.value}</p>
                  <p className="text-gray-500 text-sm mb-5">{method.desc}</p>
                  <a
                    href={method.action}
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${method.color} hover:opacity-80 transition-opacity`}
                  >
                    {method.actionLabel} <FiArrowRight size={14} />
                  </a>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <AnimatedSection animation="slideLeft">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Send Us a Message</h2>
                <div className="w-12 h-1 bg-gold-gradient rounded-full mb-4"></div>
                <p className="text-gray-400">Fill in the form below and our team will get back to you within 2 business hours.</p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-green-accent/10 border border-green-accent/20 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-accent/20 flex items-center justify-center mx-auto mb-4">
                    <FiCheck size={24} className="text-green-accent" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Message Sent!</h3>
                  <p className="text-gray-400 text-sm">Thank you for contacting us. We'll get back to you within 2 business hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Full Name <span className="text-red-accent">*</span>
                    </label>
                    <div className="relative">
                      <FiUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="John Smith"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Email Address <span className="text-red-accent">*</span>
                    </label>
                    <div className="relative">
                      <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@example.com"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Country <span className="text-red-accent">*</span>
                    </label>
                    <div className="relative">
                      <FiGlobe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        required
                        className="input-field pl-10 appearance-none"
                      >
                        <option value="">Select your country</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                        <option value="JP">Japan</option>
                        <option value="AU">Australia</option>
                        <option value="CA">Canada</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="SG">Singapore</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="">Select a subject</option>
                      <option value="account">Account Opening</option>
                      <option value="deposit">Deposit & Withdrawal</option>
                      <option value="platform">Platform Support</option>
                      <option value="trading">Trading Conditions</option>
                      <option value="verification">Account Verification</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Message <span className="text-red-accent">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="How can we help you today?"
                      className="input-field resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full gap-2 py-3.5 text-base"
                  >
                    <FiSend size={16} />
                    Send Message
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    By submitting this form, you agree to our Privacy Policy and Terms of Service.
                  </p>
                </form>
              )}
            </AnimatedSection>

            {/* Right: Info */}
            <AnimatedSection animation="slideRight" delay={0.2}>
              {/* Support Hours */}
              <div className="mb-8">
                <h3 className="text-white font-semibold text-xl mb-4">Support Hours</h3>
                <div className="space-y-3">
                  {[
                    { day: 'Monday – Friday', hours: '24 hours', status: 'Full Support' },
                    { day: 'Saturday', hours: '8:00 AM – 6:00 PM GMT', status: 'Limited' },
                    { day: 'Sunday', hours: 'Closed', status: 'Emergency Only' },
                  ].map((item) => (
                    <div key={item.day} className="flex items-center justify-between p-3 rounded-lg bg-dark-600 border border-white/5">
                      <div className="flex items-center gap-2">
                        <FiClock size={13} className="text-gold-400" />
                        <span className="text-gray-300 text-sm">{item.day}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-xs font-semibold">{item.hours}</div>
                        <div className="text-gray-500 text-xs">{item.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Offices */}
              <div className="mb-8">
                <h3 className="text-white font-semibold text-xl mb-4">Global Offices</h3>
                <div className="space-y-3">
                  {offices.map((office) => (
                    <div key={office.city} className="flex gap-3 p-4 rounded-xl bg-dark-600 border border-white/5 hover:border-gold-500/20 transition-all duration-300">
                      <span className="text-2xl flex-shrink-0">{office.flag}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-semibold text-sm">{office.city}, {office.country}</span>
                          <span className="badge bg-gold-500/10 text-gold-400 text-xs">{office.type}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <FiMapPin size={11} className="text-gold-500" />
                          {office.address}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-white font-semibold text-xl mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Open Live Account', path: '/accounts', icon: '🚀' },
                    { label: 'Open Demo Account', path: '/accounts', icon: '🎯' },
                    { label: 'View Pricing', path: '/pricing', icon: '💰' },
                    { label: 'Education Center', path: '/education', icon: '📚' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      className="flex items-center gap-2 p-3 rounded-xl bg-dark-600 border border-white/5 hover:border-gold-500/20 hover:bg-gold-500/5 transition-all duration-300 group"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-gray-300 text-xs font-medium group-hover:text-gold-400 transition-colors">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="FAQ"
            title="Common Questions"
            highlight="Common Questions"
            subtitle="Quick answers to the most frequently asked questions."
          />

          <div className="max-w-3xl mx-auto mt-12 space-y-3">
            {faqItems.map((item, i) => (
              <AnimatedSection key={i} animation="slideUp" delay={i * 0.08}>
                <div
                  className={`border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                    openFaq === i ? 'border-gold-500/30 bg-gold-500/5' : 'border-white/5 bg-dark-600 hover:border-white/10'
                  }`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex items-center justify-between p-5">
                    <h4 className="text-white font-medium text-sm pr-4">{item.q}</h4>
                    <span className={`flex-shrink-0 text-lg transition-transform duration-300 ${openFaq === i ? 'rotate-45 text-gold-400' : 'text-gray-400'}`}>
                      +
                    </span>
                  </div>
                  {openFaq === i && (
                    <div className="px-5 pb-5">
                      <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  )
}

export default Contact
