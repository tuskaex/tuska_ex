import Image from 'next/image'
import { Monitor, Smartphone, Globe, Zap, BarChart3, Shield, Check, ArrowRight } from 'lucide-react'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = { title: 'Trading Platforms' }

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

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <span className="inline-block bg-[#FDE3E3] text-[#D60101] text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Cross-Platform Trading
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Professional Trading Terminals<br />
            <span className="text-[#D60101]">for All Traders</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Trade 59 instruments in any browser, on TradingView Advanced Charts &mdash; or point your own bot at the account over our documented API.
          </p>
        </div>
      </section>

      {/* Platform Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              /* These three cards used to be "Desktop Terminal
                 (Windows & macOS)", "Mobile Trading (iOS & Android)"
                 and "Web Platform". Two of the three did not exist:
                 there is no mobile app, and the navbar's download links
                 for both returned HTTP 404 because no /downloads
                 directory was on the server. The mobile card
                 additionally promised push notifications and biometric
                 login. They were replaced with the three surfaces a user
                 can genuinely reach today.

                 The artwork went through the same correction. It was
                 SwissCresta product shots, then a single glyph, then
                 drawn device mockups (ui/PlatformArt, now unused here),
                 and is finally TuskaEx's own. `gradient` still paints the
                 banner underneath — the images are opaque and cover it,
                 but it is what shows while one is still loading. */
              {
                image: '/marketing/web_terminal.png',
                imageAlt: 'The TuskaEx web terminal — EUR/USD chart, order ticket, open positions and watchlist',
                icon: Globe,
                title: 'Web Terminal',
                gradient: 'radial-gradient(120% 100% at 20% 0%, #F14A4A 0%, #D60101 45%, #A30000 100%)',
                availability: 'Any browser',
                cta: 'Launch',
                features: ['TradingView Advanced Charts', 'Multi-Chart Layout', 'One-Click Trading', 'No install required'],
              },
              {
                image: '/marketing/algo_connector.png',
                imageAlt: 'Many orders funnelling through a single TuskaEx connector into the trading API',
                icon: Monitor,
                title: 'Algo Connector',
                gradient: 'radial-gradient(130% 110% at 80% 10%, #F14A4A 0%, #C50101 50%, #8E0000 100%)',
                availability: 'REST + WebSocket',
                cta: 'Read the docs',
                features: ['Place & close orders', 'Read balance and margin', 'Live tick stream', 'Key + secret auth'],
              },
              {
                image: '/marketing/copy_trading.png',
                imageAlt: 'A trader watching a live candlestick chart on a wide curved monitor',
                icon: Smartphone,
                title: 'Copy Trading & PAMM',
                gradient: 'radial-gradient(120% 100% at 50% 110%, #F14A4A 0%, #D60101 50%, #A30000 100%)',
                availability: 'Built into the dashboard',
                cta: 'Explore',
                features: ['Follow a master account', 'Mirror trades automatically', 'PAMM by NAV units', 'Track from one dashboard'],
              },
            ].map(({ image, imageAlt, icon: Icon, title, gradient, availability, cta, features }) => (
              <div
                key={title}
                className="flex flex-col rounded-3xl bg-white p-3 ring-1 ring-gray-100 shadow-[0_20px_50px_-22px_rgba(0,0,0,0.30)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-24px_rgba(0,0,0,0.35)]"
              >
                {/* Banner: brand-red surface carrying a drawn mockup of the
                    platform itself. The artwork scales with the card and
                    lifts slightly on hover, so the whole tile reads as one
                    object rather than a picture glued to a panel. */}
                <div
                  className="group/art relative h-44 overflow-hidden rounded-2xl"
                  style={{ background: gradient }}
                >
                  {/* top sheen — stops the flat fill reading as a swatch */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,rgba(255,255,255,0.22),transparent_60%)]"
                  />
                  <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover/art:scale-[1.04]">
                    {/* object-cover, because the shots are ~2:1 and the banner
                        is not — letting them letterbox would show bands of the
                        gradient the artwork is meant to replace. fill + sizes
                        keeps Next from serving the full 1784px original for a
                        176px-tall tile. */}
                    <Image
                      src={image}
                      alt={imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                </div>

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
              /* Rewritten against the shipped product. What went:
                   "<40ms order execution"  — nothing measures latency;
                                              the figure was invented.
                   "150+ Tools & indicators" — a made-up total on top of
                                              two other made-up numbers.
                   "Up to 4 monitors"        — there is no desktop build
                                              to detach panels onto.
                   "Mobile Sync across all devices" — there is no mobile
                                              app; the APK link 404s.
                   "50+ forex pairs"         — there are 29.
                 What stayed is verifiable: TradingView Advanced Charts
                 really does ship the indicator library, 2FA is real
                 (user_2fa_backup_codes), and 59 is a row count. */
              { icon: BarChart3, label: 'Analysis', meta: 'Core', title: 'TradingView Charts', desc: 'The terminal runs TradingView Advanced Charts — the full built-in indicator and drawing-tool library, on saveable layouts.', tags: ['Indicators', 'Drawing tools'], stat: 'Advanced', statLabel: 'TradingView charting' },
              { icon: Globe, label: 'Markets', meta: 'Core', title: 'Global Markets', desc: 'Forex, indices, commodities, energies, share CFDs and crypto — all on one balance and one margin pool.', tags: ['6 asset classes', 'One account'], stat: '59', statLabel: 'Tradable instruments' },
              { icon: Zap, label: 'Automation', meta: 'Pro', title: 'Algo Trading API', desc: 'Documented HTTPS JSON API plus a live WebSocket tick stream, so your own bot trades the account directly.', tags: ['REST', 'WebSocket'], stat: 'Open API', statLabel: 'Bring your own bot' },
              { icon: Shield, label: 'Security', meta: 'Core', title: 'Account Security', desc: 'Two-factor authentication with backup codes, email verification, and session and IP audit logging.', tags: ['2FA', 'Audit log'], stat: '2FA', statLabel: 'On every account' },
              { icon: Monitor, label: 'Workspace', meta: 'Pro', title: 'Multi-Chart Layout', desc: 'Several charts side by side in one browser tab, with one-click trading from the ticket.', tags: ['Multi-chart', 'One-click'], stat: 'Multi', statLabel: 'Charts per workspace' },
              { icon: Smartphone, label: 'Risk', meta: 'Core', title: 'Automatic Stop-Out', desc: 'Margin call at 80% and automatic position closure at 50%, recalculated by the risk engine on every tick.', tags: ['Margin call 80%', 'Stop-out 50%'], stat: '1:100', statLabel: 'Maximum leverage' },
            ].map(({ icon: Icon, label, meta, title, desc, tags, stat, statLabel }) => (
              <div
                key={title}
                className="group flex flex-col rounded-3xl bg-white p-6 ring-1 ring-gray-100 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-22px_rgba(0,0,0,0.30)]"
              >
                {/* top row: circular icon + status pill */}
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FDE3E3] ring-1 ring-[#D60101]/15">
                    <Icon className="h-6 w-6 text-[#D60101]" />
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
              className="bg-[#D60101] hover:bg-[#A30000] text-white font-semibold px-8 py-3.5 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              Open Live Account
            </a>
            <a
              href="/auth/login"
              className="border border-gray-300 hover:border-[#D60101] text-gray-900 font-semibold px-8 py-3.5 rounded-lg transition-colors"
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
