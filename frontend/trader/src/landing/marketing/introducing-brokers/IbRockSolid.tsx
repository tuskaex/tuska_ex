interface Pillar {
  title: string
  body: string
}

const PILLARS: Pillar[] = [
  {
    title: 'Strength',
    body: "Modern infrastructure built to handle institutional-grade volume — designed for resilience across volatile market conditions.",
  },
  {
    title: 'Security',
    body: 'TuskaEx applies modern security practices end-to-end — segregated client funds, encrypted infrastructure, and continuous monitoring against fraud and abuse.',
  },
  {
    title: 'Transparency',
    body: 'We hold ourselves to high standards of transparency and operational rigor across every product on the platform — clean pricing, predictable execution, and clear policies.',
  },
]

function LogoChip({ label }: { label: string }) {
  return (
    <div className="px-6 py-3 flex items-center justify-center">
      <span className="text-gray-600 text-sm font-semibold tracking-wider lowercase">{label}</span>
    </div>
  )
}

export default function IbRockSolid() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-[#D60101] text-center max-w-3xl mx-auto leading-tight">
          Rely on a rock-solid partner
        </h2>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          <LogoChip label="TuskaEx" />
          <LogoChip label="Segregated funds" />
          <LogoChip label="Daily audit" />
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-8 md:gap-10">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-gray-900">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
