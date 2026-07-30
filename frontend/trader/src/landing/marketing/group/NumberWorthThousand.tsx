import { HEADING_SECTION } from '../ui/headings'

interface Stat {
  label: string
  value: string
  unit?: string
}

const STATS: Stat[] = [
  { label: 'Products', value: '+4', unit: 'million' },
  { label: 'Offices', value: '12', unit: 'offices around the globe' },
  { label: 'Clients worldwide', value: '+1', unit: 'million accounts' },
  { label: 'Employees', value: '1448' },
]

export default function NumberWorthThousand() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <h2 className={`${HEADING_SECTION} text-center max-w-2xl mx-auto`}>
          A number is worth a thousand words
        </h2>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#E94E1B] text-white rounded-2xl p-6 md:p-7">
              <p className="text-xs uppercase tracking-[0.15em] font-semibold text-white/90">
                {s.label}
              </p>
              <div className="mt-4 text-4xl md:text-5xl font-extrabold leading-none">{s.value}</div>
              {s.unit && <p className="mt-2 text-xs text-white/85">{s.unit}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
