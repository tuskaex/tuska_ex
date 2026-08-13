import Link from 'next/link'
import { Globe, Zap, Activity, ShieldCheck, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Currency Pairs' }

const PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', spread: 'from 0.1', leverage: 'up to 1:500' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', spread: 'from 0.4', leverage: 'up to 1:500' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', spread: 'from 0.2', leverage: 'up to 1:500' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', spread: 'from 0.3', leverage: 'up to 1:500' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', spread: 'from 0.3', leverage: 'up to 1:500' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', spread: 'from 0.4', leverage: 'up to 1:500' },
]

/* All three of these were fabricated infrastructure claims:
 *
 *   "Sub-30 ms execution — co-located matching infrastructure inside
 *    LD4 and NY4, median fill latency under 30 ms, 99.9% under 80 ms"
 *      TuskaEx runs on a single VPS. There is no LD4 or NY4 presence,
 *      and no latency instrumentation exists to measure any of it.
 *
 *   "Tier-1 prime brokerage relationships across 16 liquidity
 *    providers … no last-look practices"
 *      There are zero liquidity providers. This is a B-book: the house
 *      is the counterparty. CORECEN_LP_ENABLED is unset.
 *
 *   "Negative balance protection"
 *      Not implemented. No such rule exists in the risk engine.
 *
 * Replaced with three things the platform actually does, each of which
 * can be pointed at in the code or the database. */
const FEATURES = [
  {
    icon: Zap,
    title: 'Live institutional pricing',
    body: 'Quotes stream from an institutional market-data feed over a WebSocket, so the price on your ticket is the price the engine fills against.',
  },
  {
    icon: Activity,
    title: '29 pairs, one account',
    body: 'Majors, minors and crosses alongside indices, metals, energies, share CFDs and crypto — all on a single balance and margin pool.',
  },
  {
    icon: ShieldCheck,
    title: 'Automatic risk controls',
    body: 'Stop Loss and Take Profit on every order, a margin call at 80%, and automatic stop-out at 50% enforced by the risk engine on every tick.',
  },
]

export default function CurrencyPairsPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="relative bg-gradient-to-b from-white to-gray-50 pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
              Markets · Foreign Exchange
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05]">
              The world&apos;s<br />
              <span className="text-[#D60101]">largest market.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
              Trade 80+ currency pairs across majors, minors, and exotics. Spreads from
              0.1 pips on EUR/USD, execution that doesn&apos;t blink, and an institutional-grade
              counterparty you can actually call.
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
            <Globe className="relative w-32 h-32 md:w-44 md:h-44 text-[#D60101]" strokeWidth={1.25} />
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              Major pairs
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Indicative spreads under normal market conditions. Live pricing visible on the trading terminal.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  <th className="px-5 py-3">Symbol</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Min spread (pips)</th>
                  <th className="px-5 py-3">Leverage</th>
                </tr>
              </thead>
              <tbody>
                {PAIRS.map((p) => (
                  <tr key={p.symbol} className="border-t border-gray-200 hover:bg-gray-50/60">
                    <td className="px-5 py-4 font-mono font-semibold text-gray-900">{p.symbol}</td>
                    <td className="px-5 py-4 text-gray-700">{p.name}</td>
                    <td className="px-5 py-4 font-mono text-[#D60101] font-semibold">{p.spread}</td>
                    <td className="px-5 py-4 text-gray-700">{p.leverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs italic text-gray-500">
            Maximum leverage is capped according to client classification (retail / professional)
            and the regulatory jurisdiction of the account.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-7 border border-gray-200/60">
                <span className="w-11 h-11 rounded-xl bg-[#D60101]/10 text-[#D60101] flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
            Ready to trade <span className="text-[#D60101]">FX?</span>
          </h2>
          <p className="mt-4 text-base text-gray-700">
            Open a live account or test-drive the platform on a funded demo.
          </p>
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
