import { HEADING_SECTION } from '../ui/headings'

interface Stat {
  label: string
  value: string
  unit?: string
}

const STATS: Stat[] = [
  { label: 'Core capital ratio', value: '25.0%' },
  { label: 'Clients worldwide', value: '>1', unit: 'million' },
  { label: 'Total equity', value: '>1.4', unit: 'CHF — billion' },
  { label: 'Client assets', value: '>88.7', unit: 'CHF — billion' },
]

export default function TrustNumbers() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={`${HEADING_SECTION} text-center`}>Trust in the numbers</h2>
        <p className="mt-4 text-center text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Our figures are our best ambassadors. Even with innovation and fintech at the core,
          TuskaEx never forgets about its reliability, financial strength and Swissness.
        </p>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#E94E1B] text-white rounded-2xl p-6 md:p-7">
              <p className="text-xs uppercase tracking-[0.15em] text-white/85 font-semibold">
                {s.label}
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-extrabold leading-none">{s.value}</span>
              </div>
              {s.unit && <p className="mt-2 text-xs text-white/85">{s.unit}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
