/**
 * Pure geometry and formatting for the native chart. No React, no RN — so it
 * can be reasoned about (and tested) without mounting anything.
 *
 * Coordinate conventions used everywhere below:
 *   • Bar indices are indices into the full `bars` array, 0 = oldest.
 *   • `x` is measured from the left edge of the PLOT area (the price axis
 *     gutter is not part of it).
 *   • `y` grows downward, SVG-style: y=0 is the top of the plot.
 */

/**
 * Timeframes the gateway can actually serve.
 *
 * These keys are the TradingView-style resolution strings that
 * `/instruments/{symbol}/bars` maps through `_TV_RESOLUTION_TO_TF`. Anything
 * outside this set silently falls back to 5-minute bars server-side, which is
 * how the old timeframe list ended up with a "1W" button that quietly showed
 * 5m candles. Keep this list and the backend map in step.
 */
export const TIMEFRAMES = [
  { res: '1', label: '1m', seconds: 60 },
  { res: '5', label: '5m', seconds: 300 },
  { res: '15', label: '15m', seconds: 900 },
  { res: '30', label: '30m', seconds: 1800 },
  { res: '60', label: '1H', seconds: 3600 },
  { res: '240', label: '4H', seconds: 14400 },
  { res: 'D', label: '1D', seconds: 86400 },
];

const SECONDS_BY_RES = TIMEFRAMES.reduce((acc, t) => {
  acc[t.res] = t.seconds;
  return acc;
}, { '1D': 86400 });

/** Seconds per bar for a resolution string. Unknown resolutions read as 5m,
 *  matching the backend's own fallback so the two never disagree. */
export function resolutionSeconds(res) {
  return SECONDS_BY_RES[String(res)] || 300;
}

/** The epoch-second bucket a timestamp belongs to, for a given bar size. */
export function bucketStart(epochSeconds, barSeconds) {
  return Math.floor(epochSeconds / barSeconds) * barSeconds;
}

/** Clamp helper — used enough below to be worth naming. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * The slice of bars currently on screen.
 *
 * `offset` is how many bars the view is scrolled back from the newest bar, so
 * offset=0 always pins the latest candle to the right edge. Expressing the
 * viewport this way (rather than as an absolute index) means appending a new
 * live candle does not shift what the user is looking at.
 */
export function visibleRange(total, barCount, offset) {
  const count = clamp(Math.round(barCount), 8, 400);
  const maxOffset = Math.max(0, total - count);
  const off = clamp(Math.round(offset), 0, maxOffset);
  const end = total - off;              // exclusive
  const start = Math.max(0, end - count);
  return { start, end, count, offset: off, maxOffset };
}

/**
 * Price bounds for the visible candles, padded so nothing touches the edges.
 *
 * `extra` carries prices that must stay on screen even when they sit outside
 * the candles' own range — the SL/TP/entry lines. Without it, dragging a stop
 * beyond the visible high would move it off the chart and make it ungrabbable.
 */
export function priceBounds(bars, start, end, extra = []) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = start; i < end; i++) {
    const b = bars[i];
    if (!b) continue;
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  for (const p of extra) {
    if (typeof p === 'number' && Number.isFinite(p)) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (max === min) {
    // A dead-flat window would divide by zero. Open it to +/-0.1%.
    const pad = Math.abs(max) * 0.001 || 0.5;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

/** Build the two scale functions for a viewport. */
export function makeScales({ plotWidth, plotHeight, count, min, max }) {
  const barWidth = plotWidth / Math.max(1, count);
  const span = max - min || 1;
  return {
    barWidth,
    /** Center x of the i-th visible bar (i is 0-based within the viewport). */
    x: (i) => (i + 0.5) * barWidth,
    /** y for a price. */
    y: (price) => plotHeight - ((price - min) / span) * plotHeight,
    /** Inverse of `y` — needed to turn a drag position back into a price. */
    priceAt: (y) => min + ((plotHeight - y) / plotHeight) * span,
    /** Viewport-local bar index under an x position. */
    indexAt: (x) => Math.floor(x / barWidth),
  };
}

/**
 * "Nice" price gridlines — roughly `target` of them, landing on 1/2/5 x 10^n
 * so the labels read as round numbers instead of arbitrary fractions.
 */
export function priceTicks(min, max, target = 5) {
  const span = max - min;
  if (!(span > 0)) return [];
  const rough = span / target;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v);
  return out;
}

/**
 * Time-axis labels: at most `target` of them, snapped to bar boundaries and
 * evenly spaced by index (not by clock time — markets have gaps, and spacing
 * by clock time puts labels where there are no candles).
 */
export function timeTicks(bars, start, end, target = 4) {
  const count = end - start;
  if (count <= 0) return [];
  const step = Math.max(1, Math.floor(count / target));
  const out = [];
  for (let i = count - 1; i >= 0; i -= step) {
    const bar = bars[start + i];
    if (bar) out.push({ i, time: bar.time });
  }
  return out.reverse();
}

/** Price formatter honouring the instrument's digit count. */
export function formatPrice(value, digits = 5) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

/**
 * Axis labels drop trailing precision the eye does not need: a gridline at
 * 1.10000 reads better as 1.1000 when the neighbouring lines differ in the
 * fourth decimal. Keeps at most `digits`, never fewer than 2.
 */
export function formatAxisPrice(value, digits = 5) {
  if (!Number.isFinite(Number(value))) return '';
  const d = clamp(digits, 2, 8);
  return Number(value).toFixed(d).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

/** Compact volume label: 1.2K / 3.4M. */
export function formatVolume(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * Time label for the axis and the crosshair.
 *
 * Intraday bars show the clock; daily bars show the date. Showing "00:00" on
 * every daily candle is the kind of thing that makes a chart look broken.
 */
export function formatBarTime(epochSeconds, barSeconds, { withDate = false, dateOnly = false } = {}) {
  const d = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (barSeconds >= 86400) return `${date}/${String(d.getFullYear()).slice(2)}`;
  if (dateOnly) return date;
  return withDate ? `${date} ${time}` : time;
}

/**
 * Does this window need dates on the time axis rather than clock times?
 *
 * Found by reading a real chart: 90 hourly candles span five days, so the
 * four axis labels land ~22 hours apart and read 21:30, 19:30, 17:30 — each
 * one EARLIER than the last, even though time is advancing left to right.
 * Bare clock times are only unambiguous while the window stays inside a day.
 */
export function axisNeedsDates(bars, start, end) {
  const first = bars[start];
  const last = bars[end - 1];
  if (!first || !last) return false;
  return (last.time - first.time) > 86400;
}

/**
 * Merge a live tick into the bar series.
 *
 * Returns a NEW array when something changed and the SAME array when nothing
 * did, so callers can skip a re-render on a tick that moves no candle (which
 * is most of them once the price is stable).
 */
export function applyTick(bars, { price, time, barSeconds }) {
  const p = Number(price);
  if (!Number.isFinite(p) || !bars.length) return bars;
  const slot = bucketStart(Number(time) || Math.floor(Date.now() / 1000), barSeconds);
  const last = bars[bars.length - 1];

  // A tick older than the last closed bar is out-of-order; ignore it rather
  // than rewriting history behind the user's back.
  if (slot < last.time) return bars;

  if (slot === last.time) {
    if (p === last.close && p <= last.high && p >= last.low) return bars;
    const next = bars.slice();
    next[next.length - 1] = {
      ...last,
      close: p,
      high: Math.max(last.high, p),
      low: Math.min(last.low, p),
    };
    return next;
  }

  // The bucket rolled over — open a fresh candle at the tick price.
  return bars.concat([{
    time: slot, open: p, high: p, low: p, close: p, volume: 0,
  }]);
}

/**
 * Fractional bar index for a timestamp — how drawings anchored in TIME find
 * their x position.
 *
 * Returns a FRACTIONAL index on purpose. A drawing anchor rarely lands exactly
 * on a bar open, and snapping it to the nearest bar would make a trend line
 * visibly jump between candles as the user zooms. Interpolating between the
 * two neighbouring bars keeps the line where it was drawn.
 *
 * Outside the loaded range it extrapolates using the bar spacing, so a line
 * drawn on old candles still points the right way after scrolling past them.
 */
export function indexForTime(bars, time, barSeconds) {
  if (!bars.length) return 0;
  const t = Number(time);
  if (t <= bars[0].time) {
    return (t - bars[0].time) / barSeconds;
  }
  const lastIdx = bars.length - 1;
  if (t >= bars[lastIdx].time) {
    return lastIdx + (t - bars[lastIdx].time) / barSeconds;
  }
  // Binary search for the bar immediately at or before `t`.
  let lo = 0;
  let hi = lastIdx;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (bars[mid].time <= t) lo = mid; else hi = mid - 1;
  }
  const span = (bars[lo + 1]?.time ?? bars[lo].time + barSeconds) - bars[lo].time;
  return lo + (span > 0 ? (t - bars[lo].time) / span : 0);
}

/** Inverse of indexForTime — a fractional bar index back to a timestamp. */
export function timeForIndex(bars, index, barSeconds) {
  if (!bars.length) return 0;
  const i = Math.floor(index);
  const frac = index - i;
  if (i < 0) return bars[0].time + index * barSeconds;
  if (i >= bars.length - 1) {
    return bars[bars.length - 1].time + (index - (bars.length - 1)) * barSeconds;
  }
  const span = bars[i + 1].time - bars[i].time;
  return bars[i].time + frac * span;
}
