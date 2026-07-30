import { Monitor, Smartphone, Globe, Zap, BarChart3, Shield, Check, ArrowRight } from 'lucide-react'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = { title: 'Trading Platforms — TuskaEx' }

export default function PlatformsPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 pt-16 pb-20">
        {/* decorative side bubbles (same motif as the Crypto section) */}
        {[
          { size: 56, top: '12%', left: '6%' },
          { size: 90, top: '34%', left: '11%' },
          { size: 44, top: '62%', left: '4%' },
          { size: 64, top: '80%', left: '14%' },
          { size: 72, top: '10%', right: '9%' },
          { size: 96, top: '40%', right: '5%' },
          { size: 52, top: '74%', right: '13%' },
        ].map((bubble, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="hidden md:block absolute rounded-full bg-gradient-to-br from-[#E94E1B]/15 to-[#E94E1B]/5 border border-[#E94E1B]/15"
            style={{
              width: bubble.size,
              height: bubble.size,
              top: bubble.top,
              left: bubble.left,
              right: bubble.right,
            }}
          />
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-block bg-[#FCE6DD] text-[#E94E1B] text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Cross-Platform Trading
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Professional Trading Terminals<br />
            <span className="text-[#E94E1B]">for All Traders</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Access institutional-grade platforms on desktop, web, and mobile. 100+ chart tools, 50+ indicators, and execution speeds under 40ms.
          </p>
        </div>
      </section>

      {/* Platform Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Monitor,
                title: 'Desktop Terminal',
                image: '/assets/Platforms_card1.png',
                gradient: 'linear-gradient(120deg, #a5c8ff 0%, #e9b8ff 45%, #ffd9b3 100%)',
                availability: 'Windows & macOS',
                cta: 'Launch',
                features: ['100+ Chart Tools', '50+ Indicators', 'Algorithmic Trading', 'Custom Workspaces'],
              },
              {
                icon: Smartphone,
                title: 'Mobile Trading',
                image: '/assets/Platforms_card2.png',
                gradient: 'linear-gradient(120deg, #b5f0e0 0%, #c3b8ff 50%, #ffc8e0 100%)',
                availability: 'iOS & Android',
                cta: 'Get app',
                features: ['Real-time Quotes', 'Push Notifications', 'One-Click Trading', 'Biometric Login'],
              },
              {
                icon: Globe,
                title: 'Web Platform',
                image: '/assets/Platforms_card3.png',
                gradient: 'linear-gradient(120deg, #ffd1a8 0%, #ffb8d9 50%, #c3c8ff 100%)',
                availability: 'Any browser',
                cta: 'Launch',
                features: ['Browser-based', 'No Installation', 'Full Features', 'Secure Trading'],
              },
            ].map(({ icon: Icon, title, image, gradient, availability, cta, features }) => (
              <div
                key={title}
                className="flex flex-col rounded-3xl bg-white p-3 ring-1 ring-gray-100 shadow-[0_20px_50px_-22px_rgba(0,0,0,0.30)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-24px_rgba(0,0,0,0.35)]"
              >
                {/* image banner — space reserved for artwork; gradient is the
                    placeholder until a real image path is set above */}
                <div
                  className="h-44 rounded-2xl bg-cover bg-center"
                  style={{ backgroundImage: image ? `url(${image})` : gradient }}
                />

                <div className="px-3 pb-2 pt-4">
                  <h3 className="text-2xl font-extrabold text-gray-900">{title}</h3>

                  <p className="mt-2 text-sm text-gray-400">Key features:</p>
                  <ul className="mt-2 space-y-1.5">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-gray-900">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <Check className="h-4 w-4 text-gray-900" strokeWidth={2.5} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-4 text-sm text-gray-400">Availability:</p>
                  <div className="mt-2 flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-4 pr-1.5">
                    <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-sm text-gray-700">{availability}</span>
                    <a
                      href="/auth/register"
                      className="shrink-0 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
                    >
                      {cta}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Everything you need for professional trading, built by traders for traders.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, label: 'Execution', meta: 'Core', title: 'Lightning Fast', desc: 'Execute trades in under 40ms with our optimized infrastructure.', tags: ['Low latency', 'Optimized routing'], stat: '<40ms', statLabel: 'Order execution' },
              { icon: BarChart3, label: 'Analysis', meta: 'Pro', title: 'Advanced Charting', desc: '100+ drawing tools and 50+ technical indicators.', tags: ['100+ tools', '50+ indicators'], stat: '150+', statLabel: 'Tools & indicators' },
              { icon: Shield, label: 'Security', meta: 'Core', title: 'Secure Trading', desc: 'Bank-level security with 2FA and encryption.', tags: ['2FA', 'Encryption'], stat: 'AES-256', statLabel: 'Bank-level security' },
              { icon: Monitor, label: 'Workspace', meta: 'Pro', title: 'Multi-Monitor', desc: 'Support for up to 4 monitors with customizable layouts.', tags: ['Custom layouts', 'Detachable'], stat: 'Up to 4', statLabel: 'Monitors supported' },
              { icon: Smartphone, label: 'Mobility', meta: 'Core', title: 'Mobile Sync', desc: 'Seamless synchronization across all devices.', tags: ['Real-time', 'Cross-device'], stat: 'Instant', statLabel: 'Sync across devices' },
              { icon: Globe, label: 'Markets', meta: 'Core', title: 'Global Markets', desc: 'Access 50+ forex pairs, crypto, metals, and indices.', tags: ['Forex', 'Crypto & metals'], stat: '50+', statLabel: 'Tradable instruments' },
            ].map(({ icon: Icon, label, meta, title, desc, tags, stat, statLabel }) => (
              <div
                key={title}
                className="group flex flex-col rounded-3xl bg-white p-6 ring-1 ring-gray-100 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-22px_rgba(0,0,0,0.30)]"
              >
                {/* top row: circular icon + status pill */}
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE6DD] ring-1 ring-[#E94E1B]/15">
                    <Icon className="h-6 w-6 text-[#E94E1B]" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Included
                  </span>
                </div>

                {/* label + meta */}
                <div className="mt-5 flex items-center gap-1.5 text-sm">
                  <span className="font-medium text-gray-800">{label}</span>
                  <span className="text-gray-400">· {meta}</span>
                </div>

                {/* title */}
                <h3 className="mt-1 text-xl font-bold text-gray-900">{title}</h3>

                {/* tag pills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-gray-500">{desc}</p>

                {/* divider + bottom row: stat left, action button right */}
                <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-5">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{stat}</div>
                    <div className="text-xs text-gray-400">{statLabel}</div>
                  </div>
                  <a
                    href="/auth/register"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Ready to Start Trading?</h2>
          <p className="text-gray-500 text-lg mb-8">
            Experience professional trading platforms with institutional-grade features.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/auth/register"
              className="bg-[#E94E1B] hover:bg-[#C73E11] text-white font-semibold px-8 py-3.5 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Open Live Account
            </a>
            <a
              href="/auth/login"
              className="border border-gray-300 hover:border-[#E94E1B] text-gray-900 font-semibold px-8 py-3.5 rounded-lg transition-colors"
            >
              Try Demo
            </a>
          </div>
        </div>
      </section>

      <Disclaimer />
    </div>
  )
}
