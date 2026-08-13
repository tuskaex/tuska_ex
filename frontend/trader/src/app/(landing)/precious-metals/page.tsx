import Link from 'next/link'
import { Coins, Shield, Clock, BarChart3, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Precious Metals' }

const METALS = [
  { symbol: 'XAU/USD', name: 'Gold', spread: 'from 0.18', leverage: 'up to 1:100' },
  { symbol: 'XAG/USD', name: 'Silver', spread: 'from 0.025', leverage: 'up to 1:50' },
  { symbol: 'XPT/USD', name: 'Platinum', spread: 'from 2.5', leverage: 'up to 1:20' },
  { symbol: 'XPD/USD', name: 'Palladium', spread: 'from 6.0', leverage: 'up to 1:20' },
]

const FEATURES = [
  {
    icon: Shield,
    title: 'Vaulted with tier-1 custodians',
    body: 'Physical-backed exposure with safekeeping handled by professional partner vaults — auditable, allocated, insured.',
  },
  {
    icon: Clock,
    title: 'Trade nearly 24/5',
    body: 'Continuous London / New York / Asia coverage. Open and close positions on your schedule, not the market’s.',
  },
  {
    icon: BarChart3,
    title: 'Institutional spreads',
    body: 'Aggregated liquidity from Tier-1 bullion banks. Spreads from 0.18 on gold, 0.025 on silver.',
  },
]

export default function PreciousMetalsPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="relative bg-gradient-to-b from-white to-gray-50 pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
              Markets · Precious Metals
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05]">
              Gold. Silver.<br />
              <span className="text-[#D60101]">Timeless.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
              The oldest store of value, traded with the newest infrastructure. Take a
              position on gold, silver, platinum or palladium with institutional spreads
              and institutional-grade settlement — no physical delivery required.
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
            <Coins className="relative w-32 h-32 md:w-44 md:h-44 text-[#D60101]" strokeWidth={1.25} />
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              Available instruments
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              All quotes in USD. Indicative spreads under normal market conditions.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  <th className="px-5 py-3">Symbol</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Min spread</th>
                  <th className="px-5 py-3">Leverage</th>
                </tr>
              </thead>
              <tbody>
                {METALS.map((m) => (
                  <tr key={m.symbol} className="border-t border-gray-200 hover:bg-gray-50/60">
                    <td className="px-5 py-4 font-mono font-semibold text-gray-900">{m.symbol}</td>
                    <td className="px-5 py-4 text-gray-700">{m.name}</td>
                    <td className="px-5 py-4 font-mono text-[#D60101] font-semibold">{m.spread}</td>
                    <td className="px-5 py-4 text-gray-700">{m.leverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs italic text-gray-500">
            Leverage limits vary by client classification and regulatory jurisdiction.
            Retail and professional clients are subject to different margin requirements.
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
            Ready to add metals to your <span className="text-[#D60101]">portfolio?</span>
          </h2>
          <p className="mt-4 text-base text-gray-700">
            Open a live account in minutes. KYC handled in line with international AML standards.
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
