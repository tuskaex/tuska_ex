import Link from 'next/link'
import { Shield, FileText, AlertTriangle, BugPlay, ArrowRight, Scale } from 'lucide-react'
import Disclaimer from '@/landing/marketing/Disclaimer'
import PolicyHeroVisual from '@/landing/marketing/ui/PolicyHeroVisual'

export const metadata = {
  title: 'Policies & Legal — TuskaEx',
  description:
    'Privacy, terms of service, risk disclosure, and vulnerability reporting policies for TuskaEx clients and partners.',
}

const DOCS = [
  {
    icon: Shield,
    title: 'Privacy Policy',
    body: 'How we collect, store, and process your personal data — and the rights you have under GDPR and applicable data-protection law.',
    href: '/privacy',
  },
  {
    icon: FileText,
    title: 'Terms of Service',
    body: 'The agreement that governs your use of the TuskaEx platform, the trading account, and our public marketing site.',
    href: '/terms',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Disclosure',
    body: 'Full disclosure of the risks associated with leveraged trading, margin requirements, and CFD-specific considerations.',
    href: '/risk',
  },
  {
    icon: BugPlay,
    title: 'Vulnerability Disclosure',
    body: 'How to report a security issue responsibly. We answer every legitimate report and credit researchers when appropriate.',
    href: '/privacy#vulnerability',
  },
]

const REGULATORY = [
  {
    label: 'Client funds segregation',
    body: 'Client money is held in segregated accounts at our banking partners, separated from corporate funds.',
    image: '/assets/Policy_icon1.png',
  },
  {
    label: 'AML / KYC',
    body: 'Onboarding, transaction monitoring, and politically-exposed-person screening aligned with industry standards.',
    image: '/assets/Policy_icon2.png',
  },
]

export default function PolicyPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* Was a bare `url(/assets/Policy_hero_bg3.png)` cover image — a flat
          orange smear that filled the empty right-hand grid column. The
          bitmap is gone; the glow is now a brand-red radial and the right
          column carries an actual visual. */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-white pt-24 pb-16 md:pt-28 md:pb-20">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[10%] top-1/2 h-[120%] w-[70%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.18),transparent_65%)]"
        />
        <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left — copy + CTAs */}
            <div className="-translate-y-10 md:-translate-y-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
                Policies &amp; Legal
              </p>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05]">
                Clear rules.<br />
                <span className="text-[#D60101]">No fine-print games.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base md:text-lg text-gray-700 leading-relaxed">
                Every document below is the actual contract you’re entering into. Read them in
                full before opening an account — and reach out to{' '}
                <Link href="/contact" className="text-[#D60101] font-semibold underline-offset-4 hover:underline">
                  legal@tuskaex.com
                </Link>{' '}
                if anything is unclear.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#documents"
                  className="inline-flex items-center justify-center rounded-full bg-gray-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
                >
                  Read the policies
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-7 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-[#D60101] hover:text-[#D60101]"
                >
                  Contact legal <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            </div>

            {/* Right — document stack. Previously an empty grid cell that
                showed nothing but the background image. */}
            <div className="hidden lg:block">
              <PolicyHeroVisual />
            </div>
          </div>
        </div>
      </section>

      <section id="documents" className="scroll-mt-24 bg-white pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DOCS.map(({ icon: Icon, title, body, href }, i) => {
              const onLeft = i % 2 === 0
              return (
                <Link
                  key={title}
                  href={href}
                  className="group relative block rounded-3xl bg-gradient-to-b from-[#D60101] to-[#F14A4A] shadow-[0_18px_45px_-20px_rgba(214,1,1,0.55)] transition-transform duration-300 hover:-translate-y-1"
                >
                  {/* white face shifted to expose a colored accent bar on one side */}
                  <div
                    className={`relative overflow-hidden rounded-3xl bg-white p-7 md:p-8 ${onLeft ? 'ml-3.5' : 'mr-3.5'}`}
                  >
                    {/* big outlined step number watermark (accent side) */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 select-none text-[130px] font-extrabold leading-none ${onLeft ? 'left-2' : 'right-2'}`}
                      style={{ color: 'transparent', WebkitTextStroke: '2px rgba(214,1,1,0.35)' }}
                    >
                      {i + 1}
                    </span>

                    {/* gradient icon badge (opposite corner to the number) */}
                    <span
                      className={`absolute top-7 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D60101] to-[#F14A4A] text-white shadow-md ${onLeft ? 'right-6' : 'left-6'}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>

                    {/* content, kept clear of the number (one side) and icon (other) */}
                    <div className={`relative flex flex-col gap-3 ${onLeft ? 'pl-24 pr-14' : 'pr-24 pl-14'}`}>
                      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#D60101] group-hover:gap-2 transition-all">
                        Read the document <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="w-full mx-auto px-6 md:px-10 lg:px-16">
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-50 px-6 md:px-10 lg:px-16 py-16 md:py-20">
            {/* decorative side bubbles (same motif as the Crypto section) */}
            {[
              { size: 56, top: '8%', left: '6%' },
              { size: 84, top: '24%', left: '12%' },
              { size: 44, top: '58%', left: '4%' },
              { size: 60, top: '74%', left: '16%' },
              { size: 72, top: '14%', right: '9%' },
              { size: 96, top: '42%', right: '5%' },
              { size: 56, top: '72%', right: '13%' },
            ].map((bubble, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="hidden md:block absolute rounded-full bg-gradient-to-br from-[#D60101]/15 to-[#D60101]/5 border border-[#D60101]/15"
                style={{
                  width: bubble.size,
                  height: bubble.size,
                  top: bubble.top,
                  left: bubble.left,
                  right: bubble.right,
                }}
              />
            ))}

            <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <Scale className="w-10 h-10 text-[#D60101] mx-auto" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              Regulatory framework
            </h2>
            <p className="mt-3 text-sm md:text-base text-gray-600">
              TuskaEx operates under a multi-jurisdictional licensing structure designed for
              both retail and professional clients.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {REGULATORY.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-5 rounded-3xl bg-white p-5 ring-1 ring-gray-100 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.30)]"
              >
                {/* icon / image space — reserved on the left like the reference */}
                <div
                  className="h-24 w-24 shrink-0 rounded-2xl bg-gray-100 bg-cover bg-center"
                  style={row.image ? { backgroundImage: `url(${row.image})` } : undefined}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#D60101]">
                    {row.label}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
            Something not clear?
          </h2>
          <p className="mt-4 text-base text-gray-700">
            We&apos;d rather you ask first than be surprised later. Compliance and legal teams
            both respond within two business days.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-[#D60101] hover:bg-[#A30000] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Contact compliance
            </Link>
            <Link
              href="/risk"
              className="inline-flex items-center gap-2 border border-gray-900 hover:bg-gray-900 hover:text-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Read the risk disclosure
            </Link>
          </div>
        </div>
      </section>

      <Disclaimer />
    </div>
  )
}
