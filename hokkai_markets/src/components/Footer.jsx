// ============================================
// HOKKAI MARKETS - Footer — Cyber-Samurai
// ============================================

import React from 'react'
import { Link } from 'react-router-dom'
import {
  FiMail, FiMessageCircle,
  FiTwitter, FiFacebook, FiLinkedin, FiInstagram, FiYoutube,
  FiArrowRight, FiShield, FiAlertTriangle
} from 'react-icons/fi'

const footerLinks = {
  quickLinks: [
    { label: 'Home',         path: '/' },
    { label: 'About Us',     path: '/about' },
    { label: 'Contact',      path: '/contact' },
    { label: 'Open Account', path: '/accounts' },
    { label: 'Demo Account', path: '/accounts' },
  ],
  tradingProducts: [
    { label: 'Forex Trading',  path: '/trading' },
    { label: 'Indices',        path: '/trading' },
    { label: 'Commodities',    path: '/trading' },
    { label: 'Stocks',         path: '/trading' },
    { label: 'Cryptocurrency', path: '/trading' },
  ],
  platforms: [
    { label: 'Hokkai WebTrader',  path: '/platforms' },
    { label: 'Mobile App',        path: '/platforms' },
    { label: 'Desktop Terminal',  path: '/platforms' },
    { label: 'Copy Trading',      path: '/platforms' },
    { label: 'VPS Hosting',       path: '/tools-research' },
  ],
  legal: [
    { label: 'Risk Disclosure',    path: '/about' },
    { label: 'Privacy Policy',     path: '/about' },
    { label: 'Terms & Conditions', path: '/about' },
    { label: 'AML Policy',         path: '/about' },
    { label: 'Cookie Policy',      path: '/about' },
  ],
}

const socialLinks = [
  { icon: <FiTwitter />,   label: 'Twitter',   href: '#' },
  { icon: <FiFacebook />,  label: 'Facebook',  href: '#' },
  { icon: <FiLinkedin />,  label: 'LinkedIn',  href: '#' },
  { icon: <FiInstagram />, label: 'Instagram', href: '#' },
  { icon: <FiYoutube />,   label: 'YouTube',   href: '#' },
]

function Footer() {
  return (
    <footer
      className="border-t border-white/5"
      style={{ background: 'linear-gradient(180deg, #07090e 0%, #05070a 100%)' }}
    >
      {/* Top neon line */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(225,29,72,0.4), transparent)' }} />

      {/* Main Footer Content */}
      <div className="section-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">

          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center mb-5 group w-fit">
              <img
                src="/logo.png"
                alt="Hokkai Markets"
                className="h-10 w-auto object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(225,29,72,0.6)]"
              />
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              Hokkai Markets is a global multi-asset brokerage delivering professional trading solutions to retail and institutional traders worldwide.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <a
                href="mailto:support@hokkaimarkets.com"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#e11d48] transition-colors duration-200"
              >
                <FiMail size={13} className="text-[#e11d48] flex-shrink-0" />
                support@hokkaimarkets.com
              </a>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <FiMessageCircle size={13} className="text-[#e11d48] flex-shrink-0" />
                Live Chat — 24/5 Support
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#e11d48] hover:border-[#e11d48]/30 hover:bg-[#e11d48]/5 transition-all duration-200"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-4"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#e11d48] transition-colors duration-200 group"
                  >
                    <FiArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#e11d48]" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trading Products */}
          <div>
            <h4
              className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-4"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              Markets
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.tradingProducts.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#e11d48] transition-colors duration-200 group"
                  >
                    <FiArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#e11d48]" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platforms */}
          <div>
            <h4
              className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-4"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              Platforms
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.platforms.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#e11d48] transition-colors duration-200 group"
                  >
                    <FiArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#e11d48]" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4
              className="text-white font-semibold text-xs uppercase tracking-[0.15em] mb-4"
              style={{ fontFamily: "'Michroma', sans-serif" }}
            >
              Legal
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#e11d48] transition-colors duration-200 group"
                  >
                    <FiArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[#e11d48]" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="border-t border-white/5">
        <div className="section-container py-5">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
            <FiAlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-xs font-semibold text-yellow-500 mb-1 uppercase tracking-wider">Risk Warning</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Trading leveraged products carries a high level of risk and may not be suitable for all investors.
                You may lose more than your initial investment. Please ensure you fully understand the risks involved
                and seek independent advice if necessary. Past performance is not indicative of future results.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="section-container py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 font-mono">
              © {new Date().getFullYear()} Hokkai Markets. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <FiShield size={11} className="text-[#00d4aa]" />
                SSL Secured
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse"
                  style={{ boxShadow: '0 0 5px rgba(0,212,170,0.7)' }}
                />
                All Systems Operational
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
