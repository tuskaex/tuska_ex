import Link from 'next/link'
import Image from 'next/image'
import { Phone } from 'lucide-react'
import { BRAND_LOGO, BRAND_LOGO_LIGHT } from '@/config/brand'

/* Same structure in both themes — only the palette swaps. Dark exists for the
   cyber-samurai home page, where a white footer ended the page on a bright
   slab after eleven dark sections. It uses that page's crimson (#e11d48)
   rather than the light chrome's #D60101, matching the navbar's dark mode. */
const FOOTER_THEME = {
  light: {
    shell: 'bg-white border-gray-200',
    lead: 'text-gray-500',
    strong: 'text-gray-900',
    heading: 'text-gray-900',
    link: 'text-gray-500',
    linkHover: 'hover:text-[#D60101]',
    rule: 'border-gray-200',
    muted: 'text-gray-400',
  },
  dark: {
    shell: 'bg-[#05070a] border-white/10',
    lead: 'text-slate-400',
    strong: 'text-slate-100',
    heading: 'text-slate-100',
    link: 'text-slate-400',
    linkHover: 'hover:text-[#e11d48]',
    rule: 'border-white/10',
    muted: 'text-slate-500',
  },
} as const

interface LandingFooterProps {
  /* Defaults to 'light' so the ~27 light marketing paths are untouched. */
  theme?: 'light' | 'dark'
}

export default function LandingFooter({ theme = 'light' }: LandingFooterProps) {
  const c = FOOTER_THEME[theme]
  return (
    <footer className={`border-t py-12 ${c.shell}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="lg:col-span-2">
            <Link href="/" aria-label="TuskaEx home" className="inline-flex items-center gap-2 mb-4">
              <Image
                src={theme === 'dark' ? BRAND_LOGO_LIGHT : BRAND_LOGO}
                alt="TuskaEx"
                width={1947}
                height={361}
                className="h-9 w-auto"
              />
            </Link>
            <p className={`text-sm leading-relaxed mb-3 max-w-sm ${c.lead}`}>
              Professional multi-asset trading platform for serious traders.
            </p>
            <p className={`text-sm ${c.lead}`}>
              <span className={`font-medium ${c.strong}`}>Headquarters:</span><br />
              Rue de la Tour-de-l&apos;Île 4, 1204 Genève
            </p>
          </div>

          <div>
            <p className={`font-semibold mb-4 ${c.heading}`}>Products</p>
            <ul className={`space-y-2 text-sm ${c.link}`}>
              <li><Link href="/platforms" className={`${c.linkHover} transition-colors`}>Trading Platforms</Link></li>
              <li><Link href="/auth/register" className={`${c.linkHover} transition-colors`}>Open Live Account</Link></li>
              <li><Link href="/demo-account" className={`${c.linkHover} transition-colors`}>Demo Account</Link></li>
              <li><Link href="/partners" className={`${c.linkHover} transition-colors`}>Become a Partner</Link></li>
            </ul>
          </div>

          <div>
            <p className={`font-semibold mb-4 ${c.heading}`}>Company</p>
            <ul className={`space-y-2 text-sm ${c.link}`}>
              <li><Link href="/about" className={`${c.linkHover} transition-colors`}>About Us</Link></li>
              <li><Link href="/contact" className={`${c.linkHover} transition-colors`}>Contact</Link></li>
              <li><Link href="/policy" className={`${c.linkHover} transition-colors`}>Policy &amp; Legal</Link></li>
            </ul>
          </div>

          <div>
            <p className={`font-semibold mb-4 ${c.heading}`}>Support</p>
            <ul className={`space-y-2 text-sm ${c.link}`}>
              <li><Link href="/contact" className={`${c.linkHover} transition-colors`}>Contact Support</Link></li>
              <li>
                <a
                  href="tel:+33759159987"
                  className={`inline-flex items-center gap-2 ${c.linkHover} transition-colors`}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>+33 7 59 15 99 87</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={`border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 ${c.rule}`}>
          <p className={`text-sm ${c.muted}`}>&copy; {new Date().getFullYear()} TuskaEx. All rights reserved.</p>
          <div className={`flex items-center gap-5 text-sm ${c.muted}`}>
            <Link href="/privacy" className={`${c.linkHover} transition-colors`}>Privacy Policy</Link>
            <Link href="/terms" className={`${c.linkHover} transition-colors`}>Terms of Service</Link>
            <Link href="/risk" className={`${c.linkHover} transition-colors`}>Risk Disclosure</Link>
            <Link href="/account-deletion" className={`${c.linkHover} transition-colors`}>Account Deletion</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
