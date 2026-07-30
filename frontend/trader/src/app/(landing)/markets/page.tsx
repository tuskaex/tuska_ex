import Link from 'next/link'
import { ArrowRight, Coins, Globe, Layers, Briefcase, Bitcoin } from 'lucide-react'

export const metadata = { title: 'Markets — TuskaEx' }

const MARKETS = [
  {
    href: '/precious-metals',
    icon: Coins,
    title: 'Precious Metals',
    body: 'Gold, silver, platinum and palladium. The assets that outlast every headline — traded with deep institutional liquidity.',
  },
  {
    href: '/currency-pairs',
    icon: Globe,
    title: 'Currency Pairs',
    body: 'The global FX market at your fingertips. Majors, minors, exotics — over 80 pairs with tight spreads and clean execution.',
  },
  {
    href: '/cfds',
    icon: Layers,
    title: 'CFDs',
    body: 'Go long, go short, go wherever the market takes you. Indices, commodities, single-stock CFDs.',
  },
  {
    href: '/',
    icon: Briefcase,
    title: 'Securities',
    body: 'Stocks, ETFs, bonds, options, futures, derivatives. The full arsenal for a portfolio that works as hard as you do.',
  },
  {
    href: '/',
    icon: Bitcoin,
    title: 'Crypto',
    body: '52 cryptocurrencies on the TuskaEx-developed exchange. Trade 24/7 with institutional-grade security.',
  },
]

export default function MarketsPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="bg-gradient-to-b from-white to-gray-50 pt-24 pb-16 md:pt-28 md:pb-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
            Markets
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05] text-gray-900">
            Every asset class.<br />
            <span className="text-[#D60101]">One account.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            From precious metals that have anchored wealth for centuries to crypto that
            settles in seconds — TuskaEx gives you reliable access to the assets that
            matter, backed by enterprise-grade infrastructure.
          </p>
        </div>
      </section>

      <section className="bg-white pb-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MARKETS.map(({ href, icon: Icon, title, body }) => (
              <Link
                key={title}
                href={href}
                className="group bg-gray-50 hover:bg-white rounded-2xl p-7 border border-gray-200/60 hover:border-[#D60101]/40 hover:shadow-lg transition-all flex flex-col gap-4"
              >
                <span className="w-11 h-11 rounded-xl bg-[#D60101]/10 text-[#D60101] flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
                <span className="fx-explore-btn mt-auto w-fit text-sm">
                  Explore <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </Link>
            ))}
          </div>

        </div>
      </section>
    </div>
  )
}
