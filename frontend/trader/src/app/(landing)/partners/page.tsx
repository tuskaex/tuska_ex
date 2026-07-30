import Image from 'next/image'
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
  title: 'Partners & Introducing Brokers — TuskaEx',
  description:
    'Earn USD 16 per standard lot with the TuskaEx Introducing Broker programme. Transparent payouts, lifetime client value, institutional-grade counterparty.',
}

const HIGHLIGHTS = [
  {
    icon: DollarSign,
    title: 'USD 16 per standard lot',
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
    body: 'Forex, indices, commodities, metals, single-stock CFDs and 52 crypto pairs — one account, one platform, one rebate stream.',
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
  { n: '03', t: 'Refer clients', d: 'Share your link. Every client that funds and trades a standard lot generates USD 16 to your wallet.' },
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
              className="absolute inset-8 rounded-[2.5rem] bg-[#E94E1B]/25 blur-3xl"
            />
            <div className="relative w-full aspect-[4/5] md:aspect-[5/6] max-w-[640px] mx-auto">
              <Image
                src="/assets/ib.png"
                alt="TuskaEx Introducing Broker programme"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-contain drop-shadow-[0_36px_60px_rgba(233,78,27,0.28)]"
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E94E1B]">
              Introducing Broker Programme
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[1.04]">
              Earn <span className="text-[#E94E1B]">USD 16</span>
              <br />
              per standard lot.
            </h1>
            <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
              Refer traders to TuskaEx and earn a flat USD 16 rebate on every
              standard FX lot they trade — for the life of the account. No tiered
              spreadsheets, no undisclosed haircuts, no clawbacks.
            </p>
            <div className="mt-6 inline-flex items-baseline gap-2 bg-white rounded-2xl border border-[#E94E1B]/25 shadow-[0_8px_24px_rgba(233,78,27,0.12)] px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                Rebate
              </span>
              <span className="text-3xl md:text-4xl font-extrabold text-[#E94E1B] leading-none tracking-tight">
                USD 16
              </span>
              <span className="text-xs font-medium text-gray-600">/ standard lot</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#apply"
                className="inline-flex items-center gap-2 bg-[#E94E1B] hover:bg-[#C73E11] text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
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
                <span className="w-11 h-11 rounded-xl bg-[#E94E1B]/10 text-[#E94E1B] flex items-center justify-center">
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
              What volume <span className="text-[#E94E1B]">actually pays</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { lots: '50 lots / mo', earn: 'USD 800' },
              { lots: '250 lots / mo', earn: 'USD 4,000' },
              { lots: '1,000 lots / mo', earn: 'USD 16,000' },
            ].map((row) => (
              <div key={row.lots} className="bg-white rounded-2xl p-7 border border-gray-200/60 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {row.lots}
                </p>
                <div className="mt-3 text-3xl md:text-4xl font-extrabold text-[#E94E1B]">
                  {row.earn}
                </div>
                <p className="mt-2 text-xs text-gray-500">Estimated monthly rebate</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs italic text-gray-500 text-center max-w-2xl mx-auto">
            Illustrative figures assuming USD 16 per standard lot. Actual earnings depend
            on client activity, instrument mix, and partnership tier.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHY.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-7 border border-gray-200/60">
                <span className="w-11 h-11 rounded-xl bg-[#E94E1B]/10 text-[#E94E1B] flex items-center justify-center">
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
                <div className="text-4xl font-extrabold text-[#E94E1B]/30 leading-none">{s.n}</div>
                <h3 className="mt-3 text-base font-bold text-gray-900">{s.t}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="apply" className="bg-white py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#E94E1B] to-[#C73E11] rounded-3xl p-8 md:p-10 text-white shadow-[0_24px_60px_rgba(233,78,27,0.28)]">
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
                'USD 16 per standard lot, paid weekly',
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
                className="inline-flex items-center gap-2 bg-white text-[#E94E1B] hover:bg-gray-100 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
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
