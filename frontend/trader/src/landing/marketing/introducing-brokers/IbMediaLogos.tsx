const OUTLETS = [
  'THE WALL STREET JOURNAL',
  'CNBC',
  'REUTERS',
  'FINANCIAL TIMES',
  'Bloomberg',
] as const

export default function IbMediaLogos() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center max-w-3xl mx-auto leading-snug">
          TuskaEx is regularly quoted and consulted by global financial media.
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {OUTLETS.map((label) => (
            <span
              key={label}
              className="text-gray-600 text-xs md:text-sm font-semibold tracking-wider opacity-70"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
