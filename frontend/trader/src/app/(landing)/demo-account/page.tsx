import Link from 'next/link'
import { Wallet, Clock, Activity, ShieldCheck, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Demo Account' }

const FEATURES = [
  {
    icon: Wallet,
    title: 'USD 100,000 virtual balance',
    body: 'Practice position sizing, leverage, and risk management without putting a cent at stake.',
  },
  {
    icon: Activity,
    title: 'Live market data',
    body: 'Same Tier-1 aggregated price feed as live accounts. No simulated prices, no make-believe slippage.',
  },
  {
    icon: Clock,
    title: '30-day reset cycle',
    body: 'The balance refreshes automatically every 30 days, so you can keep iterating on strategies.',
  },
  {
    icon: ShieldCheck,
    title: 'No card required',
    body: 'Just an email. No payment method, no KYC, no commitment.',
  },
]

const STEPS = [
  { n: '01', t: 'Sign up with an email', d: 'Verify the address and you’re in. Takes under a minute.' },
  { n: '02', t: 'Pick your platform', d: 'CFXD, TradingView, MetaTrader 4 or MetaTrader 5 — same demo balance, four interfaces.' },
  { n: '03', t: 'Start trading', d: 'Place orders, build watchlists, test risk rules. When you’re ready, open a live account.' },
]

export default function DemoAccountPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="relative bg-gradient-to-b from-white to-gray-50 pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
            Demo Account
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.05]">
            Trade the platform.<br />
            <span className="text-[#D60101]">Risk nothing.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
            A USD 100,000 virtual account on live market data. Test strategies, learn the
            execution engine, and see how a real position sits — before you ever fund a
            live account.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register?demo=1"
              className="inline-flex items-center gap-2 bg-[#D60101] hover:bg-[#A30000] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Open a demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 border border-gray-900 hover:bg-gray-900 hover:text-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Open a live account
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-7 border border-gray-200/60">
                <span className="w-11 h-11 rounded-xl bg-[#D60101]/10 text-[#D60101] flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              From sign-up to first trade <span className="text-[#D60101]">in three steps</span>
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-white rounded-2xl p-7 border border-gray-200/60">
                <div className="text-5xl font-extrabold text-[#D60101]/30 leading-none">{s.n}</div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{s.t}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
            Practice today. <span className="text-[#D60101]">Trade tomorrow.</span>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register?demo=1"
              className="inline-flex items-center gap-2 bg-[#D60101] hover:bg-[#A30000] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Open a demo
            </Link>
            <Link
              href="/platforms"
              className="inline-flex items-center gap-2 border border-gray-900 hover:bg-gray-900 hover:text-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            >
              See the platforms
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
