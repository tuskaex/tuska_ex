import { Check, Clock } from 'lucide-react'
import { HEADING_SECTION } from '../ui/headings'

const FEATURES = [
  'Trade Master, copy-trading & PAMM systems for all platforms',
  'Comprehensive reporting and monitoring tools',
  'Flexible compensation structures',
  'Aggregated liquidity pool from over 15 Tier 1 providers',
  'Efficient client on-boarding and multilingual support',
  'Exclusive market research throughout the day',
] as const

function ClockIllustration() {
  return (
    <div className="relative bg-gray-50 rounded-3xl aspect-square w-full max-w-sm mx-auto flex items-center justify-center overflow-hidden">
      <span
        className="absolute top-12 left-10 w-10 h-10 rounded-full bg-[#E94E1B]/30"
        aria-hidden="true"
      />
      <span
        className="absolute bottom-12 right-12 w-3 h-3 rounded-full bg-gray-900"
        aria-hidden="true"
      />
      <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full bg-[#E94E1B] flex items-center justify-center shadow-lg">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white flex items-center justify-center">
          <Clock className="w-20 h-20 md:w-24 md:h-24 text-[#E94E1B]" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}

export default function MmFeatures() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <h2 className={HEADING_SECTION}>
              Spend time on the markets, not on administrative tasks
            </h2>
            <ul className="mt-7 flex flex-col gap-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E94E1B] text-white flex-shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-gray-900">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <ClockIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
