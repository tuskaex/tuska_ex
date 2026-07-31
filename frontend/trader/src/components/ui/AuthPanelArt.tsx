/**
 * Animated artwork for the auth card's left panel.
 *
 * That panel was a black rectangle with a logo pinned to the top and a
 * headline to the bottom, and nothing at all between them — on a 36rem
 * card that is a lot of void to look at while typing a password.
 *
 * Drawn in SVG with CSS-only animation, so it is a plain server
 * component: no JS ships for it, nothing to hydrate, and it costs the
 * auth route — the one page where a slow first paint is most likely to
 * lose a signup — essentially nothing.
 *
 * The candle series is fixed, hand-picked and carries NO axis labels,
 * prices or dates. It is decoration on a signup form; a chart that
 * could be read as real market history has no business there. Same
 * discipline as the marketing card artwork.
 *
 * All animation is inside `motion-safe:` variants, so under
 * prefers-reduced-motion the whole thing renders as a still composition
 * rather than freezing halfway through drawing itself.
 */

type Candle = { x: number; o: number; c: number; hi: number; lo: number }

/* y grows downward, so a SMALLER y is a higher price. Trends upward
   across the series, with pullbacks so it does not read as a straight
   line pointing at the corner. */
const CANDLES: Candle[] = [
  { x: 40, o: 190, c: 178, hi: 172, lo: 196 },
  { x: 66, o: 178, c: 184, hi: 172, lo: 190 },
  { x: 92, o: 184, c: 166, hi: 160, lo: 188 },
  { x: 118, o: 166, c: 172, hi: 160, lo: 176 },
  { x: 144, o: 172, c: 152, hi: 146, lo: 176 },
  { x: 170, o: 152, c: 158, hi: 146, lo: 162 },
  { x: 196, o: 158, c: 134, hi: 128, lo: 162 },
  { x: 222, o: 134, c: 140, hi: 128, lo: 146 },
  { x: 248, o: 140, c: 116, hi: 110, lo: 144 },
  { x: 274, o: 116, c: 122, hi: 110, lo: 128 },
  { x: 300, o: 122, c: 96, hi: 88, lo: 126 },
]

const CW = 11 // candle body width
const TREND = CANDLES.map((d) => `${d.x + CW / 2},${d.c}`).join(' ')
const AREA = `${TREND} 305,215 45,215`

export default function AuthPanelArt({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <svg viewBox="0 0 360 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="apa-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D60101" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#D60101" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="apa-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F14A4A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F14A4A" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="apa-glow">
            <stop offset="0%" stopColor="#D60101" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#D60101" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Bloom behind the rise */}
        <ellipse cx="250" cy="120" rx="150" ry="110" fill="url(#apa-glow)" />

        {/* Grid — hairlines only, no ticks or values */}
        <g stroke="rgba(255,255,255,0.055)" strokeWidth="1">
          {[60, 100, 140, 180].map((y) => (
            <line key={y} x1="24" y1={y} x2="336" y2={y} />
          ))}
          {[80, 160, 240, 320].map((x) => (
            <line key={x} x1={x} y1="40" x2={x} y2="215" />
          ))}
        </g>

        {/* Area under the trend, revealed after the line draws */}
        <polygon points={AREA} fill="url(#apa-area)" className="opacity-0 motion-safe:animate-[apa-fade_0.9s_ease-out_1.5s_forwards] motion-reduce:opacity-100" />

        {/* Trend line — draws itself left to right */}
        <polyline
          points={TREND}
          fill="none"
          stroke="url(#apa-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="motion-safe:[stroke-dasharray:600] motion-safe:[stroke-dashoffset:600] motion-safe:animate-[apa-draw_1.6s_cubic-bezier(0.22,1,0.36,1)_forwards]"
        />

        {/* Candles — each grows from the baseline, staggered along the series */}
        <g>
          {CANDLES.map((d, i) => {
            const up = d.c < d.o
            const top = Math.min(d.o, d.c)
            const h = Math.max(Math.abs(d.c - d.o), 2.5)
            return (
              <g
                key={i}
                className="origin-bottom opacity-0 [transform-box:fill-box] motion-safe:animate-[apa-rise_0.5s_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:opacity-100"
                style={{ animationDelay: `${0.09 * i}s` }}
              >
                <line
                  x1={d.x + CW / 2}
                  y1={d.hi}
                  x2={d.x + CW / 2}
                  y2={d.lo}
                  stroke={up ? '#F14A4A' : 'rgba(255,255,255,0.35)'}
                  strokeWidth="1.2"
                />
                <rect
                  x={d.x}
                  y={top}
                  width={CW}
                  height={h}
                  rx="1.5"
                  fill={up ? '#D60101' : 'rgba(255,255,255,0.14)'}
                  stroke={up ? '#F14A4A' : 'rgba(255,255,255,0.4)'}
                  strokeWidth="1"
                />
              </g>
            )
          })}
        </g>

        {/* Live marker on the last close */}
        <g className="opacity-0 motion-safe:animate-[apa-fade_0.5s_ease-out_1.7s_forwards] motion-reduce:opacity-100">
          <circle cx={300 + CW / 2} cy={96} r="9" fill="#D60101" opacity="0.22" className="motion-safe:animate-ping" />
          <circle cx={300 + CW / 2} cy={96} r="4" fill="#fff" />
          <circle cx={300 + CW / 2} cy={96} r="4" fill="none" stroke="#D60101" strokeWidth="1.5" />
        </g>

        {/* Baseline */}
        <line x1="24" y1="215" x2="336" y2="215" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </svg>
    </div>
  )
}
