import IBPoster from '@/landing/marketing/ui/IBPoster'
import Link from 'next/link'
import Disclaimer from '@/landing/marketing/Disclaimer'
import {
  Handshake,
  DollarSign,
  TrendingUp,
  Users,
  Globe2,
  Wallet,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

export const metadata = {
  title: 'Partners & Introducing Brokers',
  description:
    'Refer traders to TuskaEx and earn a rebate on the volume they trade. Transparent payouts, lifetime client value, and a partner dashboard that shows the accrual daily.',
}

const HIGHLIGHTS = [
  {
    icon: DollarSign,
    title: 'Volume-based rebate',
    body: 'A flat, transparent rebate on every standard FX lot your clients trade. No tiers to game. No clawbacks. No undisclosed haircuts.',
  },
  {
    icon: Wallet,
    title: 'Lifetime client value',
    body: 'Earn on every trade your referred clients make — for as long as their account stays active with TuskaEx.',
  },
  {
    icon: TrendingUp,
    title: 'Daily reporting',
    body: 'Real-time partner dashboard with sub-IB breakdown, volume, and accrued commission. No quarterly mysteries.',
  },
]

const WHY = [
  {
    icon: ShieldCheck,
    title: 'Professional counterparty',
    body: 'Your clients trade with a platform that takes security and compliance seriously. Easier to onboard, easier to retain.',
  },
  {
    icon: Globe2,
    title: 'Multi-asset offering',
    body: 'Forex, indices, commodities, energies, single-stock CFDs and crypto — 59 instruments, one account, one rebate stream.',
  },
  {
    icon: Users,
    title: 'White-glove partner desk',
    body: 'Dedicated account manager, marketing toolkit, and 24/7 onboarding support for your sub-IBs.',
  },
]

const STEPS = [
  { n: '01', t: 'Apply', d: 'Submit the partner application. We review and respond within two business days.' },
  { n: '02', t: 'Get your IB code', d: 'Receive your unique referral link and access to the partner dashboard.' },
  { n: '03', t: 'Refer clients', d: 'Share your link. Every standard lot your referred clients trade accrues a rebate to your partner wallet.' },
  { n: '04', t: 'Get paid', d: 'Withdraw weekly to bank wire, card, or crypto. No minimum threshold.' },
]

export default function PartnersPage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="relative bg-gradient-to-b from-white to-gray-50 pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="relative order-2 md:order-1">
            <div
              aria-hidden="true"
              className="absolute inset-8 rounded-[2.5rem] bg-[#D60101]/25 blur-3xl"
            />
            <div className="relative w-full aspect-[4/5] md:aspect-[5/6] max-w-[640px] mx-auto drop-shadow-[0_36px_60px_rgba(214,1,1,0.28)]">
              <IBPoster />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
              Introducing Broker Programme
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.04]">
              Earn on every
              <br />
              <span className="text-[#D60101]">lot they trade.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
              Refer traders to TuskaEx and earn a rebate on every standard lot they
              trade — for the life of the account. No undisclosed haircuts, no
              clawbacks, and the accrual is visible in your dashboard daily.
            </p>
            {/* Was a "USD 16 / standard lot" price tag. The
                ib_commission_plans table is empty — no rate has been
                configured, so no rate can be published. The panel now
                states what the programme actually gives a partner
                today, all of which is backed by real tables:
                ib_profiles, referrals, ib_commissions. */}
            <div className="mt-6 inline-flex flex-col gap-1 bg-white rounded-2xl border border-[#D60101]/25 shadow-[0_8px_24px_rgba(214,1,1,0.12)] px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Rebate rate
              </span>
              <span className="text-lg md:text-xl font-extrabold text-[#D60101] leading-tight tracking-tight">
                Agreed per partner
              </span>
              <span className="text-xs font-medium text-gray-600">
                Set with the partner desk before you start referring
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#apply"
                className="inline-flex items-center gap-2 bg-[#D60101] hover:bg-[#A30000] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Become a partner <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-gray-900 hover:bg-gray-900 hover:text-white text-gray-900 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Talk to the partner desk
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              The numbers, without the small print
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Built for serious IBs, money managers and community leaders who want clean economics.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-7 border border-gray-200/60">
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

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {/* This was an earnings table — 50 lots/mo → USD 800, 250 →
              USD 4,000, 1,000 → USD 16,000 — under the heading "What
              volume actually pays". Every figure derived from a USD 16
              rate that was never configured, so the table projected
              income from a number that did not exist. An italic
              "illustrative figures" line underneath does not repair a
              headline promising what volume ACTUALLY pays.

              Replaced with how the programme mechanically works, which
              is true regardless of the rate eventually agreed. */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              How the rebate <span className="text-[#D60101]">is calculated</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { k: 'Per standard lot', v: 'Your agreed rate accrues on every standard lot a referred client closes.' },
              { k: 'For the life of the account', v: 'The referral link is bound to the client, not to a campaign window.' },
              { k: 'Visible daily', v: 'Accrued commission and per-client volume update in your partner dashboard.' },
            ].map((row) => (
              <div key={row.k} className="bg-white rounded-2xl p-7 border border-gray-200/60">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D60101]">
                  {row.k}
                </p>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{row.v}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs italic text-gray-500 text-center max-w-2xl mx-auto">
            Your rate is agreed with the partner desk before you begin. Actual earnings
            depend on client activity and instrument mix.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHY.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-7 border border-gray-200/60">
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

      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              From application to first payout
            </h2>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-white rounded-2xl p-7 border border-gray-200/60">
                <div className="text-4xl font-extrabold text-[#D60101]/30 leading-none">{s.n}</div>
                <h3 className="mt-3 text-base font-bold text-gray-900">{s.t}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="apply" className="bg-white py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#D60101] to-[#A30000] rounded-3xl p-8 md:p-10 text-white shadow-[0_24px_60px_rgba(214,1,1,0.28)]">
            <Handshake className="w-10 h-10 text-white/90" strokeWidth={1.5} />
            <h2 className="mt-5 text-2xl md:text-3xl font-extrabold uppercase tracking-tight">
              Apply to become a TuskaEx partner
            </h2>
            <p className="mt-3 text-sm md:text-base text-white/90 leading-relaxed">
              Tell us a bit about your audience and we&apos;ll route you to a partner manager
              within two business days.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/90">
              {[
                'A rebate rate agreed with you before you start',
                'Lifetime rebates — no expiry on referred accounts',
                'Sub-IB structure with full reporting',
                'Dedicated partner desk, 24/7',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/auth/register?partner=1"
                className="inline-flex items-center gap-2 bg-white text-[#D60101] hover:bg-gray-100 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Start application <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-white/70 text-white hover:bg-white/10 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Talk to a partner manager
              </Link>
            </div>
          </div>

          <p className="mt-6 text-xs italic text-gray-500 text-center">
            Rebate amounts are quoted per standard FX lot (100,000 units of base currency).
            Payouts are subject to the TuskaEx Partner Agreement and standard AML / KYC
            verification of both the partner entity and the referred client.
          </p>
        </div>
      </section>

      <Disclaimer />
    </div>
  )
}
