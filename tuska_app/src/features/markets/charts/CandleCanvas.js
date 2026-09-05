import React, { memo, useMemo } from 'react';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { vantage } from '../../../theme/vantageTheme';
import { FIB_LEVELS } from './drawingStore';
import {
  axisNeedsDates,
  indexForTime,
  formatAxisPrice,
  formatBarTime,
  makeScales,
  priceTicks,
  timeTicks,
} from './chartGeometry';

/**
 * The chart's pixels. Deliberately presentational: it takes a window of bars
 * plus a few overlay prices and draws them. It holds no state, does no I/O and
 * knows nothing about positions, gestures or the network — everything that can
 * go wrong at runtime lives in NativeChart.js instead.
 *
 * Memoized on its props because it re-renders on every price tick, and a tick
 * that does not move a candle must not repaint several hundred SVG nodes.
 */

const AXIS_WIDTH = 58;   // right-hand price gutter
const TIME_HEIGHT = 20;  // bottom time strip
const VOLUME_FRACTION = 0.16; // share of plot height the volume bars may use

/**
 * Chart colours, matched to the web terminal.
 *
 * The web renders TradingView Advanced Charts on its DEFAULT dark theme and
 * overrides only two things (`TradingViewChart.tsx`): the pane background to
 * `#0b0e11` and the scale text to `#b7bdc6`. Everything else — the teal-green
 * up candle, the salmon-red down candle, the grid — is TradingView's own dark
 * palette.
 *
 * So these are deliberately NOT the app's `vantage.up`/`down` brand tokens. A
 * trader looking at the same symbol on the phone and on the desktop should see
 * the same coloured candles; matching the brand instead of the other terminal
 * would have been the wrong loyalty.
 */
const CHART = {
  bg: '#0B0E11',
  grid: '#2A2E39',
  axisText: '#B7BDC6',
  up: '#26A69A',
  down: '#EF5350',
  crosshair: '#9598A1',
};

// The web pins a small fixed right margin so the newest candle hugs the right
// edge the way MT5 does, instead of floating in wide future whitespace.
const RIGHT_MARGIN_BARS = 3;

function CandleCanvas({
  bars,
  start,
  end,
  width,
  height,
  // Price bounds are computed by the container, not here: the draggable
  // SL/TP chips are plain RN views positioned outside this SVG, and they must
  // land on exactly the same pixel as the line drawn inside it. One scale,
  // one owner.
  min,
  max,
  digits = 5,
  barSeconds = 300,
  // Overlay price levels: [{ price, color, label, dashed }]
  levels = [],
  // Crosshair position in plot coordinates, or null.
  crosshair = null,
  chartType = 'candle',
  // User drawings, anchored in { time, price }. Converted to pixels here so
  // they stay glued to the candles through every pan and zoom.
  drawings = [],
  selectedDrawingId = null,
  // The shape being drawn right now (first anchor placed, second following
  // the finger), rendered dashed so it reads as provisional.
  pendingDrawing = null,
}) {
  const plotWidth = Math.max(1, width - AXIS_WIDTH);
  const plotHeight = Math.max(1, height - TIME_HEIGHT);

  // Lay the bars out over `count + RIGHT_MARGIN_BARS` slots but draw only
  // `count` of them, which leaves a few bars of empty space on the right.
  // The web does the same so the newest candle sits just off the price axis
  // rather than flush against it.
  const count = end - start;
  const scales = useMemo(
    () => makeScales({
      plotWidth, plotHeight, count: count + RIGHT_MARGIN_BARS, min, max,
    }),
    [plotWidth, plotHeight, count, min, max],
  );
  const { x, y, barWidth } = scales;

  // Volume shares the plot area rather than getting its own pane: a separate
  // pane costs vertical space the price action needs more on a phone screen.
  const volumeTop = plotHeight * (1 - VOLUME_FRACTION);
  const maxVolume = useMemo(() => {
    let m = 0;
    for (let i = start; i < end; i++) {
      const v = Number(bars[i]?.volume) || 0;
      if (v > m) m = v;
    }
    return m;
  }, [bars, start, end]);

  const gridPrices = useMemo(() => priceTicks(min, max, 5), [min, max]);
  const gridTimes = useMemo(() => timeTicks(bars, start, end, 4), [bars, start, end]);
  const datedAxis = useMemo(() => axisNeedsDates(bars, start, end), [bars, start, end]);

  // A single Path for the line/area shapes beats one node per point.
  const linePath = useMemo(() => {
    if (chartType === 'candle') return null;
    let d = '';
    for (let i = start; i < end; i++) {
      const bar = bars[i];
      if (!bar) continue;
      d += `${d ? 'L' : 'M'}${x(i - start).toFixed(1)} ${y(bar.close).toFixed(1)} `;
    }
    return d.trim() || null;
  }, [bars, start, end, chartType, x, y]);

  const bodyWidth = Math.max(1, Math.min(barWidth * 0.66, 14));
  const lastBar = bars[end - 1];

  return (
    <Svg width={width} height={height}>
      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <G>
        {gridPrices.map((p) => (
          <Line
            key={`gp${p}`}
            x1={0}
            x2={plotWidth}
            y1={y(p)}
            y2={y(p)}
            stroke={CHART.grid}
            strokeWidth={0.5}
          />
        ))}
        {gridTimes.map((t) => (
          <Line
            key={`gt${t.time}`}
            x1={x(t.i)}
            x2={x(t.i)}
            y1={0}
            y2={plotHeight}
            stroke={CHART.grid}
            strokeWidth={0.5}
          />
        ))}
      </G>

      {/* ── Volume ───────────────────────────────────────────────────── */}
      {maxVolume > 0 ? (
        <G opacity={0.35}>
          {Array.from({ length: count }, (_, i) => {
            const bar = bars[start + i];
            if (!bar) return null;
            const v = Number(bar.volume) || 0;
            if (v <= 0) return null;
            const h = (v / maxVolume) * (plotHeight - volumeTop);
            const up = bar.close >= bar.open;
            return (
              <Rect
                key={`v${bar.time}`}
                x={x(i) - bodyWidth / 2}
                y={plotHeight - h}
                width={bodyWidth}
                height={h}
                fill={up ? CHART.up : CHART.down}
              />
            );
          })}
        </G>
      ) : null}

      {/* ── Price series ─────────────────────────────────────────────── */}
      {chartType === 'candle' ? (
        <G>
          {Array.from({ length: count }, (_, i) => {
            const bar = bars[start + i];
            if (!bar) return null;
            const up = bar.close >= bar.open;
            const color = up ? CHART.up : CHART.down;
            const cx = x(i);
            const openY = y(bar.open);
            const closeY = y(bar.close);
            const top = Math.min(openY, closeY);
            // A doji has zero body height and would render as nothing at all,
            // so every body is at least one pixel tall.
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));
            return (
              <G key={bar.time}>
                <Line
                  x1={cx}
                  x2={cx}
                  y1={y(bar.high)}
                  y2={y(bar.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                <Rect
                  x={cx - bodyWidth / 2}
                  y={top}
                  width={bodyWidth}
                  height={bodyHeight}
                  fill={color}
                />
              </G>
            );
          })}
        </G>
      ) : linePath ? (
        <Path
          d={linePath}
          stroke={vantage.accent}
          strokeWidth={1.6}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* ── Overlay levels (entry / SL / TP / last price) ─────────────── */}
      <G>
        {levels.map((lv) => {
          if (!Number.isFinite(lv.price) || lv.price < min || lv.price > max) return null;
          const ly = y(lv.price);
          return (
            <G key={lv.key}>
              <Line
                x1={0}
                x2={plotWidth}
                y1={ly}
                y2={ly}
                stroke={lv.color}
                strokeWidth={1}
                strokeDasharray={lv.dashed ? '4 4' : undefined}
              />
              <Rect
                x={plotWidth}
                y={ly - 8}
                width={AXIS_WIDTH}
                height={16}
                fill={lv.color}
                rx={2}
              />
              <SvgText
                x={plotWidth + AXIS_WIDTH / 2}
                y={ly + 4}
                fill={vantage.textPrimary}
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
              >
                {formatAxisPrice(lv.price, digits)}
              </SvgText>
            </G>
          );
        })}
      </G>

      {/* ── Price axis ───────────────────────────────────────────────── */}
      <G>
        <Line
          x1={plotWidth}
          x2={plotWidth}
          y1={0}
          y2={plotHeight}
          stroke={CHART.grid}
          strokeWidth={0.5}
        />
        {gridPrices.map((p) => (
          <SvgText
            key={`pl${p}`}
            x={plotWidth + 6}
            y={y(p) + 3}
            fill={CHART.axisText}
            fontSize={9}
          >
            {formatAxisPrice(p, digits)}
          </SvgText>
        ))}
      </G>

      {/* ── Time axis ────────────────────────────────────────────────── */}
      <G>
        {gridTimes.map((t) => (
          <SvgText
            key={`tl${t.time}`}
            x={x(t.i)}
            y={plotHeight + 13}
            fill={CHART.axisText}
            fontSize={9}
            textAnchor="middle"
          >
            {formatBarTime(t.time, barSeconds, { dateOnly: datedAxis })}
          </SvgText>
        ))}
      </G>

      {/* ── User drawings ────────────────────────────────────────────── */}
      <G>
        {[...drawings, ...(pendingDrawing ? [pendingDrawing] : [])].map((d) => {
          const provisional = pendingDrawing && d === pendingDrawing;
          const selected = d.id === selectedDrawingId;
          const stroke = selected ? vantage.accentGlow : (d.color || vantage.accent);
          const width = selected ? 2 : 1.5;
          const dash = provisional ? '5 4' : undefined;

          // Anchor -> pixel. `start` is the viewport's first bar, so the x of
          // an absolute bar index is (index - start).
          const px = (pt) => x(indexForTime(bars, pt.time, barSeconds) - start);
          const py = (pt) => y(pt.price);
          const pts = d.points || [];
          if (!pts.length) return null;

          if (d.type === 'horizontal') {
            const hy = py(pts[0]);
            return (
              <G key={d.id}>
                <Line x1={0} x2={plotWidth} y1={hy} y2={hy} stroke={stroke} strokeWidth={width} strokeDasharray={dash} />
                <Rect x={plotWidth} y={hy - 8} width={AXIS_WIDTH} height={16} fill={stroke} rx={2} />
                <SvgText x={plotWidth + AXIS_WIDTH / 2} y={hy + 4} fill="#FFFFFF" fontSize={9} fontWeight="700" textAnchor="middle">
                  {formatAxisPrice(pts[0].price, digits)}
                </SvgText>
              </G>
            );
          }

          if (pts.length < 2) return null;
          const x1 = px(pts[0]); const y1 = py(pts[0]);
          const x2 = px(pts[1]); const y2 = py(pts[1]);

          if (d.type === 'rect') {
            return (
              <Rect
                key={d.id}
                x={Math.min(x1, x2)} y={Math.min(y1, y2)}
                width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)}
                stroke={stroke} strokeWidth={width} strokeDasharray={dash}
                fill={stroke} fillOpacity={0.08}
              />
            );
          }

          if (d.type === 'fib') {
            // Levels run between the two anchors' PRICES; the box spans their
            // x range so the retracement sits over the move it describes.
            const lo = Math.min(x1, x2); const hi = Math.max(x1, x2);
            return (
              <G key={d.id}>
                {FIB_LEVELS.map((lv) => {
                  const price = pts[0].price + (pts[1].price - pts[0].price) * lv;
                  const fy = y(price);
                  return (
                    <G key={`${d.id}${lv}`}>
                      <Line x1={lo} x2={hi} y1={fy} y2={fy} stroke={stroke} strokeWidth={1} strokeDasharray={dash} opacity={0.85} />
                      <SvgText x={lo + 3} y={fy - 3} fill={stroke} fontSize={8}>
                        {lv.toFixed(3)}
                      </SvgText>
                    </G>
                  );
                })}
              </G>
            );
          }

          // A ray keeps going past its second anchor; a trend line stops there.
          let ex = x2; let ey = y2;
          if (d.type === 'ray') {
            const dx = x2 - x1; const dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            const reach = plotWidth + plotHeight;
            ex = x2 + (dx / len) * reach;
            ey = y2 + (dy / len) * reach;
          }
          return (
            <G key={d.id}>
              <Line x1={x1} x2={ex} y1={y1} y2={ey} stroke={stroke} strokeWidth={width} strokeDasharray={dash} />
              {selected ? (
                <G>
                  <Circle cx={x1} cy={y1} r={4} fill={stroke} />
                  <Circle cx={x2} cy={y2} r={4} fill={stroke} />
                </G>
              ) : null}
            </G>
          );
        })}
      </G>

      {/* ── Crosshair ────────────────────────────────────────────────── */}
      {crosshair ? (
        <G>
          <Line
            x1={0}
            x2={plotWidth}
            y1={crosshair.y}
            y2={crosshair.y}
            stroke={CHART.crosshair}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          <Line
            x1={crosshair.x}
            x2={crosshair.x}
            y1={0}
            y2={plotHeight}
            stroke={CHART.crosshair}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          <Rect
            x={plotWidth}
            y={crosshair.y - 8}
            width={AXIS_WIDTH}
            height={16}
            fill="#2A2E39"
            rx={2}
          />
          <SvgText
            x={plotWidth + AXIS_WIDTH / 2}
            y={crosshair.y + 4}
            fill={vantage.textPrimary}
            fontSize={9}
            fontWeight="700"
            textAnchor="middle"
          >
            {formatAxisPrice(scales.priceAt(crosshair.y), digits)}
          </SvgText>
        </G>
      ) : null}

      {/* ── Last price marker ────────────────────────────────────────── */}
      {lastBar ? (
        <G>
          <Line
            x1={0}
            x2={plotWidth}
            y1={y(lastBar.close)}
            y2={y(lastBar.close)}
            stroke={CHART.crosshair}
            strokeWidth={0.5}
            strokeDasharray="2 3"
          />
          <Rect
            x={plotWidth}
            y={y(lastBar.close) - 8}
            width={AXIS_WIDTH}
            height={16}
            fill={lastBar.close >= lastBar.open ? CHART.up : CHART.down}
            rx={2}
          />
          <SvgText
            x={plotWidth + AXIS_WIDTH / 2}
            y={y(lastBar.close) + 4}
            fill="#FFFFFF"
            fontSize={9}
            fontWeight="700"
            textAnchor="middle"
          >
            {formatAxisPrice(lastBar.close, digits)}
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

export { AXIS_WIDTH, TIME_HEIGHT };
export default memo(CandleCanvas);
