import * as SecureStore from 'expo-secure-store';

/**
 * Per-symbol chart drawings.
 *
 * Anchors are stored as **{ time, price }**, never as pixels. A drawing is a
 * statement about the market ("resistance at 4460 from Tuesday"), not about
 * the screen — store it in screen space and it slides off the price action the
 * moment the user pans, zooms or rotates the phone. Everything converts to
 * pixels at render time through the same scales the candles use.
 *
 * Keyed by symbol so a trend line drawn on XAUUSD does not appear on EURUSD.
 * SecureStore is the app's existing local-store (see watchlistStorage.js); the
 * data is not secret, it is just the store the app already has.
 */

const KEY_PREFIX = 'speedtrade.drawings.';

// A hard ceiling per symbol. SecureStore rejects values over ~2 KB on some
// Android builds, and a chart with hundreds of shapes is unreadable anyway.
const MAX_PER_SYMBOL = 40;

const cache = new Map();

function keyFor(symbol) {
  return `${KEY_PREFIX}${String(symbol || '').toUpperCase()}`;
}

export async function getDrawings(symbol) {
  const key = keyFor(symbol);
  if (cache.has(key)) return cache.get(key);
  let list = [];
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    }
  } catch (_) { /* unreadable store — start clean rather than block the chart */ }
  cache.set(key, list);
  return list;
}

export async function saveDrawings(symbol, list) {
  const key = keyFor(symbol);
  const trimmed = (Array.isArray(list) ? list : []).slice(-MAX_PER_SYMBOL);
  cache.set(key, trimmed);
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(trimmed));
  } catch (_) { /* persistence is best-effort; the in-memory copy still works */ }
  return trimmed;
}

/** Tools the chart offers. `points` is how many taps a tool needs. */
export const TOOLS = [
  { key: 'cursor', icon: 'navigate-outline', label: 'Cursor', points: 0 },
  { key: 'trend', icon: 'trending-up-outline', label: 'Trend line', points: 2 },
  { key: 'horizontal', icon: 'remove-outline', label: 'Horizontal', points: 1 },
  { key: 'ray', icon: 'arrow-forward-outline', label: 'Ray', points: 2 },
  { key: 'rect', icon: 'square-outline', label: 'Rectangle', points: 2 },
  { key: 'fib', icon: 'reorder-four-outline', label: 'Fibonacci', points: 2 },
];

/** Fibonacci retracement levels, drawn between the two anchors. */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function newDrawing(type, points) {
  return {
    id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type,
    points,
  };
}

/**
 * Distance in pixels from a point to a line segment — the hit test for
 * selecting a drawing by tapping near it.
 *
 * A tap has to land within a tolerance of the LINE, not of its endpoints:
 * testing endpoints only would make the middle of a long trend line untappable,
 * which is most of it.
 */
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  // Projection of the point onto the segment, clamped to its ends.
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
