import Image from 'next/image'
import { Banknote, CalendarClock, Headset, Layers } from 'lucide-react'

/**
 * Introducing-Broker poster for /partners, drawn in CSS.
 *
 * Replaces /assets/ib.png, which was a SwissCresta marketing poster
 * carried over from the white-label kit: their logo mark, their
 * "SwissCresta" wordmark, their "TRADE BEYOND LIMITS." tagline, a
 * "$16 PER STANDARD LOT" figure, "BECOME A PART OF THE SWISSCRESTA
 * FAMILY" and "SWISSCRESTA.COM" — all baked into the bitmap and all
 * rendering live under an alt text that read "TuskaEx Introducing
 * Broker programme".
 *
 * Deliberately carries NO rebate figure: the page's right-hand column
 * already states "USD 16 per standard lot" twice (headline + rebate
 * pill), so repeating it a third time here would be noise, and a number
 * baked into artwork is exactly what made the original impossible to
 * update when the rate changed.
 */
const PILLARS = [
  { icon: Banknote, title: 'High CPA', body: 'Flat rebate, paid per standard lot' },
  { icon: CalendarClock, title: 'Weekly payouts', body: 'Bank, card or crypto — no minimum' },
  { icon: Headset, title: 'Dedicated desk', body: '24/7 onboarding for your sub-IBs' },
  { icon: Layers, title: 'Multi-asset', body: 'FX, metals, indices, CFDs, crypto' },
]

export default function IBPoster({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-7 ring-1 ring-white/10 sm:p-9 ${className}`}
    >
      {/* Brand-red bloom, top-right */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/3 -top-1/3 h-[110%] w-[110%] rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.55),transparent_65%)]"
      />
      {/* Faint grid, evokes a price chart without inventing numbers */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:38px_38px]"
      />

      <div className="relative flex h-full flex-col">
        <Image
          src="/marketing/tuskaex-logo-light.png"
          alt="TuskaEx"
          width={710}
          height={187}
          className="h-auto w-40 sm:w-48"
        />

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50">
          Partner Programme
        </p>
        <h2 className="mt-3 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
          IB
          <br />
          Partner
        </h2>
        <p className="mt-4 text-sm uppercase tracking-[0.18em] text-[#F14A4A]">
          Earn more. Grow together.
        </p>

        <ul className="mt-auto space-y-3 pt-8">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D60101]/15 ring-1 ring-[#D60101]/40">
                <Icon className="h-4 w-4 text-[#F14A4A]" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="block text-xs leading-snug text-white/55">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
