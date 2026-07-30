import { Link } from 'react-router-dom'
import { Instagram, Youtube, Facebook, Mail } from 'lucide-react'
import ScrollReveal from './animations/ScrollReveal'

const columns = {
  Trading: [
    { name: 'Forex',       path: '/trading/forex' },
    { name: 'Indices',     path: '/trading/indices' },
    { name: 'Commodities', path: '/trading/commodities' },
    { name: 'Crypto',      path: '/trading/crypto' },
  ],
  Platforms: [
    { name: 'Web Platform',  path: '/platforms/web' },
    { name: 'Copy Trading',  path: '/platforms/copy-trading' },
    { name: 'Prop Trading',  path: '/platforms/prop-trading' },
    { name: 'IB Management', path: '/platforms/ib-management' },
  ],
  Accounts: [
    { name: 'Standard', path: '/accounts/standard' },
    { name: 'Pro',      path: '/accounts/pro' },
    { name: 'Demo',     path: '/accounts/demo' },
  ],
  Company: [
    { name: 'About Us',       path: '/about' },
    { name: 'Why TuskaEx',    path: '/company/why-tuskaex' },
    { name: 'Contact',        path: '/contact' },
  ],
}

const socials = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Youtube,   href: '#', label: 'YouTube' },
  { icon: Facebook,  href: '#', label: 'Facebook' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="relative"
      style={{
        background: 'linear-gradient(180deg, var(--fx-bg) 0%, #050608 100%)',
        borderTop: '1px solid var(--fx-line)',
      }}
    >
      <div className="fx-divider-gold" />

      <div className="fx-container py-14 md:py-20">
        {/* Top: brand + columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Brand block — spans more on mobile */}
          <div className="col-span-2 lg:col-span-2">
            <ScrollReveal variant="fadeLeft">
              <Link to="/" className="inline-flex items-center gap-2 mb-5" aria-label="TuskaEx home">
                {/* Same inline TuskaEx lockup as the navbar — keeps
                    the brand consistent without depending on a logo
                    PNG that may not yet be the final asset. */}
                <svg
                  viewBox="0 0 64 64"
                  aria-hidden="true"
                  className="w-7 h-7 shrink-0"
                >
                  <path
                    d="M48 13.5 A25 25 0 1 0 57 33"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  <path d="M19 32 L57 18.5 L40.5 30.5 L34 57 L28.5 33.5 Z" fill="#E30613" />
                </svg>
                <span className="inline-flex items-baseline font-bold tracking-tight text-lg select-none">
                  <span className="text-white">Tuska</span>
                  <span className="text-[#E94E1B]">Ex</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed max-w-sm mb-6" style={{ color: 'var(--fx-text-2)' }}>
                TuskaEx is an institutional-grade forex and CFD broker. Built for serious
                traders who demand fast execution, transparent pricing, and a platform that
                works as hard as they do.
              </p>

              <div className="flex items-center gap-2 text-sm mb-5" style={{ color: 'var(--fx-text-3)' }}>
                <Mail size={14} style={{ color: 'var(--fx-gold-light)' }} />
                <a href="mailto:support@tuskaex.com" className="hover:underline" style={{ color: 'var(--fx-text-2)' }}>
                  support@tuskaex.com
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                {socials.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--fx-line-strong)',
                      color: 'var(--fx-text-2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--fx-gold-light)'
                      e.currentTarget.style.borderColor = 'rgba(233,78,27,0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--fx-text-2)'
                      e.currentTarget.style.borderColor = 'var(--fx-line-strong)'
                    }}
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Link columns */}
          {Object.entries(columns).map(([heading, links], i) => (
            <ScrollReveal key={heading} variant="fadeUp" delay={0.05 + i * 0.05}>
              <h3
                className="text-xs uppercase tracking-[0.16em] font-semibold mb-4"
                style={{ color: 'var(--fx-gold-light)' }}
              >
                {heading}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm transition-colors"
                      style={{ color: 'var(--fx-text-2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fx-text)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fx-text-2)' }}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          ))}
        </div>

        {/* Risk warning */}
        <div
          className="mt-12 md:mt-16 p-5 md:p-6 rounded-2xl"
          style={{
            background: 'var(--fx-bg-elev)',
            border: '1px solid var(--fx-line)',
          }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-2"
            style={{ color: 'var(--fx-gold-light)' }}
          >
            Risk Warning
          </p>
          <p className="text-xs md:text-[13px] leading-relaxed" style={{ color: 'var(--fx-text-3)' }}>
            Trading forex and contracts for difference (CFDs) carries a high level of risk
            and may not be suitable for all investors. You could lose more than your initial
            investment. Past performance is not indicative of future results. Please ensure
            you fully understand the risks involved and seek independent advice if necessary.
            TuskaEx does not provide investment advice.
          </p>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 flex flex-col md:flex-row gap-3 md:gap-6 items-start md:items-center justify-between"
          style={{ borderTop: '1px solid var(--fx-line)' }}
        >
          <p className="text-xs" style={{ color: 'var(--fx-text-3)' }}>
            © {year} TuskaEx Ltd. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'var(--fx-text-3)' }}>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            <Link to="/risk" className="hover:underline">Risk Disclosure</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
