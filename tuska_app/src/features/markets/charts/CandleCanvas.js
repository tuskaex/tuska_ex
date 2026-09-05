import React, { memo, useMemo } from 'react';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { vantage } from '../../../theme/vantageTheme';
import {
  axisNeedsDates,
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
}) {
  const plotWidth = Math.max(1, width - AXIS_WIDTH);
  const plotHeight = Math.max(1, height - TIME_HEIGHT);

  const count = end - start;
  const scales = useMemo(
    () => makeScales({ plotWidth, plotHeight, count, min, max }),
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
            stroke={vantage.border}
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
            stroke={vantage.border}
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
                fill={up ? vantage.upFill : vantage.downFill}
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
            const color = up ? vantage.upFill : vantage.downFill;
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
          stroke={vantage.border}
          strokeWidth={0.5}
        />
        {gridPrices.map((p) => (
          <SvgText
            key={`pl${p}`}
            x={plotWidth + 6}
            y={y(p) + 3}
            fill={vantage.textMuted}
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
            fill={vantage.textMuted}
            fontSize={9}
            textAnchor="middle"
          >
            {formatBarTime(t.time, barSeconds, { dateOnly: datedAxis })}
          </SvgText>
        ))}
      </G>

      {/* ── Crosshair ────────────────────────────────────────────────── */}
      {crosshair ? (
        <G>
          <Line
            x1={0}
            x2={plotWidth}
            y1={crosshair.y}
            y2={crosshair.y}
            stroke={vantage.textSecondary}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          <Line
            x1={crosshair.x}
            x2={crosshair.x}
            y1={0}
            y2={plotHeight}
            stroke={vantage.textSecondary}
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          <Rect
            x={plotWidth}
            y={crosshair.y - 8}
            width={AXIS_WIDTH}
            height={16}
            fill={vantage.bgPressed}
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
            stroke={vantage.textSecondary}
            strokeWidth={0.5}
            strokeDasharray="2 3"
          />
          <Rect
            x={plotWidth}
            y={y(lastBar.close) - 8}
            width={AXIS_WIDTH}
            height={16}
            fill={lastBar.close >= lastBar.open ? vantage.upFill : vantage.downFill}
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
