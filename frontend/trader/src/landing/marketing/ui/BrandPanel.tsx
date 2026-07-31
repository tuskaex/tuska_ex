import Image from 'next/image'

/**
 * Decorative brand surface with a rising candlestick motif, drawn in SVG.
 *
 * Replaces two SwissCresta lifestyle renders that shipped with the
 * white-label kit and rendered on the marketing home page:
 *
 *   /assets/bull.png     — a bull in a suit beside a SwissCresta flag,
 *                          F1 car and billboard, their wordmark on all
 *                          three (used by DifferentBank)
 *   /assets/asianboy.png — a model in a room with the SwissCresta logo,
 *                          wordmark and "TRADE BEYOND LIMITS." tagline
 *                          on the wall, a thermos and a cylinder
 *                          (used by AboutUs)
 *
 * Both were red rather than orange, which is why they survived the first
 * pass of the rebrand. Neither could be retouched in repo.
 *
 * The candle geometry is fixed, hand-picked and purely decorative — it
 * is not sampled from real prices and carries no axis labels, so it
 * cannot read as a performance claim.
 */

/* x, openY, closeY, highY, lowY in a 0..100 viewBox. Rising overall. */
const CANDLES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [6, 78, 70, 66, 82],
  [17, 70, 74, 66, 79],
  [28, 74, 60, 55, 77],
  [39, 60, 52, 47, 63],
  [50, 52, 57, 48, 61],
  [61, 57, 40, 35, 59],
  [72, 40, 33, 27, 43],
  [83, 33, 20, 14, 36],
]

export default function BrandPanel({
  className = '',
  chips = [],
  showWordmark = true,
}: {
  className?: string
  /** Short labels along the bottom, e.g. asset classes. */
  chips?: readonly string[]
  showWordmark?: boolean
}) {
  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-7 ring-1 ring-white/10 sm:p-9 ${className}`}
    >
      {/* Brand-red bloom */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 -top-1/3 h-[110%] w-[100%] rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.5),transparent_65%)]"
      />
      {/* Chart grid */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:38px_38px]"
      />

      <div className="relative flex h-full flex-col">
        {showWordmark && (
          <Image
            src="/marketing/tuskaex-logo-light.png"
            alt="TuskaEx"
            width={710}
            height={187}
            className="h-auto w-36 sm:w-44"
          />
        )}

        {/* Candles */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="my-6 h-full min-h-[120px] w-full flex-1"
        >
          <defs>
            <linearGradient id="bp-trend" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#F14A4A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F14A4A" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Trend line through the closes */}
          <polyline
            points={CANDLES.map(([x, , close]) => `${x + 2},${close}`).join(' ')}
            fill="none"
            stroke="url(#bp-trend)"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />

          {CANDLES.map(([x, open, close, high, low], i) => {
            const up = close < open // smaller y == higher price
            const fill = up ? '#D60101' : 'rgba(255,255,255,0.22)'
            return (
              <g key={i}>
                <line
                  x1={x + 2}
                  y1={high}
                  x2={x + 2}
                  y2={low}
                  stroke={fill}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x}
                  y={Math.min(open, close)}
                  width="4"
                  height={Math.max(Math.abs(close - open), 2)}
                  fill={fill}
                  rx="0.6"
                />
              </g>
            )
          })}
        </svg>

        {chips.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/15"
              >
                {chip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
