/**
 * Platform card artwork — device mockups drawn in SVG.
 *
 * These replace the three SwissCresta product shots that used to fill
 * the /platforms cards (a laptop showing their dashboard, an App Store
 * listing for "SwissCresta — Smart Trading Platform", and a laptop with
 * their logo on screen). The interim fix was a single large glyph per
 * card, which was honest but empty.
 *
 * Drawn rather than photographed, for reasons that outlast this page:
 *   - exact brand red, no colour drift from a stock library
 *   - sharp at any DPI, and ~2 KB each instead of ~1.5 MB
 *   - no licensing question, ever
 *   - inherits currentColor, so it works on light and dark canvases
 *
 * Each renders white-on-red "glass" UI, so it reads as our product
 * rather than as clip-art. The candle series are fixed, hand-picked
 * and unlabelled: decoration on a marketing card must not be mistaken
 * for a price history or a performance claim.
 */

const W = 400
const H = 176

/* x, top, bottom of the wick; body drawn between open/close. Up candles
   are filled solid, down candles hollow — the same reading convention
   the terminal itself uses. */
type Candle = { x: number; o: number; c: number; hi: number; lo: number }

const DESKTOP_CANDLES: Candle[] = [
  { x: 124, o: 96, c: 86, hi: 82, lo: 100 },
  { x: 140, o: 86, c: 92, hi: 82, lo: 96 },
  { x: 156, o: 92, c: 74, hi: 70, lo: 95 },
  { x: 172, o: 74, c: 80, hi: 70, lo: 84 },
  { x: 188, o: 80, c: 62, hi: 57, lo: 83 },
  { x: 204, o: 62, c: 68, hi: 58, lo: 72 },
  { x: 220, o: 68, c: 52, hi: 47, lo: 71 },
  { x: 236, o: 52, c: 58, hi: 48, lo: 62 },
  { x: 252, o: 58, c: 44, hi: 40, lo: 61 },
  { x: 268, o: 44, c: 50, hi: 40, lo: 54 },
  { x: 284, o: 50, c: 38, hi: 34, lo: 53 },
  { x: 300, o: 38, c: 46, hi: 34, lo: 50 },
]

function Candles({ data, width = 6 }: { data: Candle[]; width?: number }) {
  return (
    <g>
      {data.map((d, i) => {
        const up = d.c < d.o // smaller y == higher price
        const top = Math.min(d.o, d.c)
        const h = Math.max(Math.abs(d.c - d.o), 2)
        return (
          <g key={i}>
            <line
              x1={d.x}
              y1={d.hi}
              x2={d.x}
              y2={d.lo}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="1"
            />
            <rect
              x={d.x - width / 2}
              y={top}
              width={width}
              height={h}
              rx="1"
              fill={up ? '#fff' : 'rgba(255,255,255,0.22)'}
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1"
            />
          </g>
        )
      })}
    </g>
  )
}

const frame = 'rgba(255,255,255,0.42)'
const glass = 'rgba(255,255,255,0.10)'
const glassSoft = 'rgba(255,255,255,0.06)'

function Svg({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      {children}
    </svg>
  )
}

/** Desktop terminal — chart, left rail, order ticket. */
export function DesktopArt() {
  return (
    <Svg label="TuskaEx desktop terminal showing a candlestick chart and order ticket">
      {/* monitor body */}
      <rect x="58" y="16" width="284" height="120" rx="9" fill={glass} stroke={frame} strokeWidth="1.5" />
      {/* screen */}
      <rect x="66" y="24" width="268" height="104" rx="5" fill="rgba(0,0,0,0.16)" />

      {/* left tool rail */}
      <rect x="66" y="24" width="26" height="104" rx="5" fill={glassSoft} />
      {[38, 52, 66, 80].map((y) => (
        <rect key={y} x="74" y={y} width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.55)" />
      ))}

      {/* top bar: symbol pill + timeframe chips */}
      <rect x="100" y="32" width="46" height="8" rx="4" fill="rgba(255,255,255,0.72)" />
      {[154, 172, 190].map((x) => (
        <rect key={x} x={x} y="32" width="13" height="8" rx="4" fill="rgba(255,255,255,0.28)" />
      ))}

      <Candles data={DESKTOP_CANDLES} />

      {/* live price line */}
      <line x1="100" y1="46" x2="252" y2="46" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 3" />
      <rect x="252" y="41" width="26" height="10" rx="2" fill="#fff" />

      {/* right order ticket */}
      <rect x="286" y="32" width="42" height="88" rx="4" fill={glassSoft} />
      <rect x="292" y="38" width="30" height="14" rx="3" fill="#fff" />
      <rect x="292" y="56" width="30" height="14" rx="3" fill="rgba(255,255,255,0.28)" />
      {[76, 84, 92].map((y) => (
        <rect key={y} x="292" y={y} width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      ))}
      <rect x="292" y="102" width="30" height="12" rx="3" fill="rgba(255,255,255,0.85)" />

      {/* stand */}
      <path d="M182 136 h36 l6 18 h-48 z" fill={glass} stroke={frame} strokeWidth="1.5" />
      <rect x="162" y="154" width="76" height="6" rx="3" fill={glass} stroke={frame} strokeWidth="1.5" />
    </Svg>
  )
}

/** Mobile — phone with price header, sparkline and BUY / SELL. */
export function MobileArt() {
  return (
    <Svg label="TuskaEx mobile app showing a live price, chart and buy and sell buttons">
      {/* phone body */}
      <rect x="152" y="12" width="96" height="152" rx="14" fill={glass} stroke={frame} strokeWidth="1.5" />
      <rect x="158" y="18" width="84" height="140" rx="10" fill="rgba(0,0,0,0.16)" />
      {/* notch */}
      <rect x="186" y="22" width="28" height="5" rx="2.5" fill="rgba(255,255,255,0.5)" />

      {/* symbol + price */}
      <rect x="166" y="36" width="34" height="6" rx="3" fill="rgba(255,255,255,0.75)" />
      <rect x="166" y="46" width="52" height="10" rx="3" fill="#fff" />
      <rect x="224" y="47" width="12" height="8" rx="2" fill="rgba(255,255,255,0.35)" />

      {/* sparkline + fill */}
      <path
        d="M166 96 L178 88 L190 92 L202 78 L214 84 L226 68 L238 74"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M166 96 L178 88 L190 92 L202 78 L214 84 L226 68 L238 74 V108 H166 Z"
        fill="rgba(255,255,255,0.16)"
      />

      {/* timeframe chips */}
      {[166, 184, 202, 220].map((x) => (
        <rect key={x} x={x} y="116" width="14" height="6" rx="3" fill="rgba(255,255,255,0.28)" />
      ))}

      {/* BUY / SELL */}
      <rect x="166" y="130" width="34" height="16" rx="4" fill="#fff" />
      <rect x="204" y="130" width="34" height="16" rx="4" fill="rgba(255,255,255,0.26)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />

      {/* home indicator */}
      <rect x="186" y="150" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.45)" />
    </Svg>
  )
}

/** Web — browser chrome with watchlist rows and a chart. */
export function WebArt() {
  return (
    <Svg label="TuskaEx web platform open in a browser, showing a watchlist and chart">
      {/* window */}
      <rect x="46" y="20" width="308" height="136" rx="9" fill={glass} stroke={frame} strokeWidth="1.5" />
      {/* title bar */}
      <path d="M46 29 a9 9 0 0 1 9-9 h290 a9 9 0 0 1 9 9 v13 H46 Z" fill={glassSoft} />
      {[58, 68, 78].map((cx) => (
        <circle key={cx} cx={cx} cy="31" r="3" fill="rgba(255,255,255,0.55)" />
      ))}
      {/* url pill */}
      <rect x="96" y="26" width="150" height="10" rx="5" fill="rgba(255,255,255,0.20)" />
      <rect x="102" y="29" width="52" height="4" rx="2" fill="rgba(255,255,255,0.6)" />

      {/* watchlist */}
      <rect x="56" y="52" width="78" height="94" rx="5" fill={glassSoft} />
      {[60, 78, 96, 114, 132].map((y, i) => (
        <g key={y}>
          <rect x="63" y={y} width="30" height="4" rx="2" fill="rgba(255,255,255,0.6)" />
          <rect
            x="101"
            y={y}
            width="26"
            height="4"
            rx="2"
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)'}
          />
        </g>
      ))}

      {/* chart panel */}
      <rect x="142" y="52" width="202" height="94" rx="5" fill="rgba(0,0,0,0.14)" />
      <Candles
        data={[
          { x: 162, o: 118, c: 108, hi: 104, lo: 122 },
          { x: 180, o: 108, c: 114, hi: 104, lo: 118 },
          { x: 198, o: 114, c: 96, hi: 92, lo: 117 },
          { x: 216, o: 96, c: 102, hi: 92, lo: 106 },
          { x: 234, o: 102, c: 84, hi: 79, lo: 105 },
          { x: 252, o: 84, c: 90, hi: 80, lo: 94 },
          { x: 270, o: 90, c: 74, hi: 69, lo: 93 },
          { x: 288, o: 74, c: 80, hi: 70, lo: 84 },
          { x: 306, o: 80, c: 66, hi: 62, lo: 83 },
          { x: 324, o: 66, c: 72, hi: 62, lo: 76 },
        ]}
        width={7}
      />
      {/* axis hairline */}
      <line x1="150" y1="138" x2="336" y2="138" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    </Svg>
  )
}
