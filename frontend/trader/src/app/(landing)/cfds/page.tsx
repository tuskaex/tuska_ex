import Link from 'next/link'
import { Layers, TrendingUp, TrendingDown, BarChart4, AlertTriangle, ArrowRight } from 'lucide-react'

export const metadata = { title: 'CFDs — TuskaEx' }

const CFD_GROUPS = [
  { name: 'Indices', body: 'S&P 500, NASDAQ 100, DAX, FTSE 100, Nikkei 225 — the world’s benchmark indices, traded around the clock.' },
  { name: 'Commodities', body: 'Crude (WTI / Brent), natural gas, agricultural softs. Real macro exposure without futures rolls.' },
  { name: 'Single-stock CFDs', body: '500+ US, EU and UK names. Long, short, or hedge — no settlement, no stock-borrow drama.' },
]

export default function CFDsPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="relative bg-gradient-to-b from-white to-gray-50 pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
              Markets · Contracts for Difference
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05]">
              Go long.<br />
              <span className="text-[#D60101]">Go short.</span><br />
              Go anywhere.
            </h1>
            <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
              CFDs let you take a view on indices, commodities and single stocks without
              owning the underlying — flexible, capital-efficient, and equally well-suited
              to directional trading or hedging an existing book.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-[#D60101] hover:bg-[#A30000] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Open your account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo-account"
                className="inline-flex items-center gap-2 border border-gray-900 hover:bg-gray-900 hover:text-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Try a demo
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-[#D60101]/40 to-[#D60101]/10 blur-3xl absolute" aria-hidden="true" />
            <Layers className="relative w-32 h-32 md:w-44 md:h-44 text-[#D60101]" strokeWidth={1.25} />
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              What you can trade
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CFD_GROUPS.map((g) => (
              <div key={g.name} className="bg-gray-50 rounded-2xl p-7 border border-gray-200/60">
                <h3 className="text-lg font-bold text-gray-900">{g.name}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-7 border border-gray-200/60">
              <span className="w-11 h-11 rounded-xl bg-[#D60101]/10 text-[#D60101] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Long or short</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Express any view in any direction without needing a stock-borrow facility.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-200/60">
              <span className="w-11 h-11 rounded-xl bg-[#D60101]/10 text-[#D60101] flex items-center justify-center">
                <BarChart4 className="w-5 h-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Margin efficiency</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Trade with a fraction of the notional. Capital you free up can sit in
                T-bills or other low-risk allocations.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-7 border border-gray-200/60">
              <span className="w-11 h-11 rounded-xl bg-[#D60101]/10 text-[#D60101] flex items-center justify-center">
                <TrendingDown className="w-5 h-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Hedge with precision</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Offset specific exposures without unwinding the underlying — useful for
                tax timing or portfolio rebalancing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="rounded-2xl border border-[#D60101]/30 bg-[#D60101]/5 p-6 md:p-8 flex gap-4">
            <AlertTriangle className="w-5 h-5 text-[#D60101] shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                A note on leverage
              </h3>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                CFDs are leveraged instruments. Leverage amplifies both gains and losses;
                you can lose more than your initial deposit if your account drops below
                the required margin. CFDs are not suitable for every investor — please
                read the full{' '}
                <Link href="/risk" className="underline font-semibold text-[#D60101]">
                  Risk Disclosure
                </Link>{' '}
                before opening a position.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
            Take a position. <span className="text-[#D60101]">Any direction.</span>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-[#D60101] hover:bg-[#A30000] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Open your account
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 border border-gray-900 hover:bg-gray-900 hover:text-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              All markets
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
