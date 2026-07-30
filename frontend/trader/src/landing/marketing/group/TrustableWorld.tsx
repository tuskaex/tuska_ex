import ExploreLink from '../ui/ExploreLink'
import { HEADING_SECTION } from '../ui/headings'

interface Dot {
  r: number
  c: number
}

function WorldMap() {
  const rows = 12
  const cols = 28
  const dots: Dot[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const skew = Math.sin(r * 0.6 + c * 0.4)
      const onLand =
        (r > 1 && r < 9 && ((c > 4 && c < 11) || (c > 13 && c < 22))) ||
        (r === 9 && c > 5 && c < 9) ||
        (r === 2 && c > 14 && c < 21)
      if (onLand && skew > -0.6) {
        dots.push({ r, c })
      }
    }
  }
  return (
    <div className="w-full max-w-3xl mx-auto" aria-hidden="true">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const isDot = dots.some((d) => d.r === r && d.c === c)
          return (
            <span
              key={i}
              className={`block aspect-square rounded-full ${
                isDot ? 'bg-[#E94E1B]/60' : 'bg-transparent'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function TrustableWorld() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={`${HEADING_SECTION} max-w-xl`}>Trustable in every corner of the world</h2>

        <div className="mt-10">
          <WorldMap />
        </div>

        <div className="mt-6">
          <ExploreLink>TuskaEx group structure</ExploreLink>
        </div>
      </div>
    </section>
  )
}
