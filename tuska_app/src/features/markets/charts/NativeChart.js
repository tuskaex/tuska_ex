import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { API_URL } from '../../../constants';
import { vantage, fontFamily, radius, sizes, space, weights } from '../../../theme/vantageTheme';
import { getInstruments } from '../../../utils/instrumentsCache';
import logger from '../../../utils/logger';
import webSocketService from '../../../services/websocket/WebSocketService';
import CandleCanvas, { AXIS_WIDTH, TIME_HEIGHT } from './CandleCanvas';
import {
  TIMEFRAMES,
  applyTick,
  clamp,
  formatBarTime,
  formatPrice,
  makeScales,
  priceBounds,
  resolutionSeconds,
  visibleRange,
} from './chartGeometry';

/**
 * The instrument chart, drawn natively.
 *
 * This replaces a WebView that hosted the TradingView Advanced Charting
 * Library from a ~25 MB copy bundled inside the APK. That worked, but it cost
 * a second JavaScript runtime and a postMessage bridge per chart open, only
 * ever shipped on Android (the config plugin copied the bundle into
 * `android/app/src/main/assets` and there was no iOS equivalent, so an iOS
 * build would have loaded a missing file), and the bundle is licensed
 * artwork this repository is not allowed to redistribute.
 *
 * Everything here is react-native-svg. The trade-off is honest: there are no
 * indicators and no drawing tools, which the library did provide. What is kept
 * is what the trading screen actually depends on — candles, volume, live
 * ticks, pan/zoom, a crosshair, and the open-position overlay with draggable
 * SL/TP.
 *
 * ── Threading note ───────────────────────────────────────────────────────
 * Every gesture below is declared `.runOnJS(true)`. Gesture handlers default
 * to the UI thread, where the callback body must be a worklet and can only
 * reach React state through `runOnJS`. Since every one of these callbacks
 * exists to set React state anyway, running them on the JS thread directly is
 * both simpler and avoids depending on which package re-exports `runOnJS` in
 * this Reanimated version.
 */

const HISTORY_BARS = 600;      // fetched per request
const LIVE_POLL_MS = 5000;     // REST fallback when the socket is quiet
const POSITION_POLL_MS = 3000;
const DEFAULT_VISIBLE = 90;
const MIN_VISIBLE = 20;
const MAX_VISIBLE = 320;

export default function NativeChart({
  symbol = 'EURUSD',
  interval = '60',
  onIntervalChange,
  accountId,
  onDrag,
  refreshTick,
  onClosePosition,
  chartType = 'candle',
  showTimeframes = true,
}) {
  const sym = String(symbol).toUpperCase();
  const res = String(interval);
  const barSeconds = resolutionSeconds(res);

  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ count: DEFAULT_VISIBLE, offset: 0 });
  const [crosshair, setCrosshair] = useState(null);
  const [positions, setPositions] = useState([]);
  const [digits, setDigits] = useState(5);
  // While a chip is being dragged its price comes from here, not from the
  // server copy — otherwise the 3s position poll would yank the line back
  // under the user's finger mid-drag.
  const [dragging, setDragging] = useState(null); // { id, kind, price }

  const tokenRef = useRef('');
  const barsRef = useRef([]);
  const viewRef = useRef(view);
  const gestureStart = useRef({ count: DEFAULT_VISIBLE, offset: 0 });
  // Live values the long-lived bracket gestures read at fire time. A gesture
  // that closed over these directly would have to be recreated on every
  // render, and recreating a gesture mid-drag drops the drag.
  const scalesRef = useRef(null);
  const plotHeightRef = useRef(1);
  const onDragRef = useRef(onDrag);
  const chipPriceRef = useRef({});
  const dragStartYRef = useRef(0);
  const bracketGestures = useRef(new Map());
  const oldestLoaded = useRef(null);
  const loadingMore = useRef(false);

  barsRef.current = bars;
  viewRef.current = view;
  onDragRef.current = onDrag;

  // ── Auth + instrument metadata ───────────────────────────────────────
  useEffect(() => {
    let alive = true;
    SecureStore.getItemAsync('token')
      .then((t) => { if (alive) tokenRef.current = t || ''; })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    getInstruments()
      .then((list) => {
        if (!alive) return;
        const found = (list || []).find(
          (i) => String(i.symbol).toUpperCase() === sym,
        );
        // JPY crosses quote in 3 decimals, everything else in 5. Only used
        // when the instrument record itself carries no digit count.
        const fallback = sym.endsWith('JPY') ? 3 : 5;
        setDigits(Number(found?.digits) || fallback);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [sym]);

  const authHeaders = useCallback(() => {
    const h = { Accept: 'application/json' };
    if (tokenRef.current) h.Authorization = `Bearer ${tokenRef.current}`;
    return h;
  }, []);

  const fetchBars = useCallback(async (from, to, { live = false } = {}) => {
    const url = `${API_URL}/instruments/${encodeURIComponent(sym)}/bars`
      + `?resolution=${encodeURIComponent(res)}&from=${from}&to=${to}`
      + (live ? '&live=1' : '');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url, { headers: authHeaders() });
        if (r.ok) {
          const raw = await r.json();
          const list = Array.isArray(raw)
            ? raw
            : (Array.isArray(raw?.bars) ? raw.bars : (Array.isArray(raw?.items) ? raw.items : []));
          return list
            .map((b) => ({
              time: Number(b.time),
              open: Number(b.open),
              high: Number(b.high),
              low: Number(b.low),
              close: Number(b.close),
              volume: Number(b.volume ?? 0),
            }))
            .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close))
            .sort((a, b) => a.time - b.time);
        }
        // 4xx is an answer, not a hiccup — retrying it just delays the error.
        if (r.status < 500) return [];
      } catch (e) { /* network blip — retry */ }
      await new Promise((r2) => setTimeout(r2, 400 * (attempt + 1)));
    }
    return [];
  }, [sym, res, authHeaders]);

  // ── Initial history, and a reload whenever symbol or timeframe changes ──
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    setBars([]);
    setCrosshair(null);
    setView({ count: DEFAULT_VISIBLE, offset: 0 });
    oldestLoaded.current = null;

    const to = Math.floor(Date.now() / 1000);
    const from = to - barSeconds * HISTORY_BARS;
    fetchBars(from, to).then((list) => {
      if (!alive) return;
      setBars(list);
      setLoading(false);
      setFailed(list.length === 0);
      if (list.length) oldestLoaded.current = list[0].time;
    });
    return () => { alive = false; };
  }, [sym, res, barSeconds, fetchBars]);

  // ── Older history, pulled in when the user scrolls off the left edge ──
  const loadOlder = useCallback(async () => {
    if (loadingMore.current || !oldestLoaded.current) return;
    loadingMore.current = true;
    try {
      const to = oldestLoaded.current - 1;
      const from = to - barSeconds * HISTORY_BARS;
      const older = await fetchBars(from, to);
      const prev = barsRef.current;
      const cutoff = prev.length ? prev[0].time : Infinity;
      const added = older.filter((b) => b.time < cutoff);
      if (!added.length) {
        // Nothing older exists. Clearing this stops us asking again on every
        // subsequent pan, which would otherwise be a request per frame while
        // the user holds at the edge.
        oldestLoaded.current = null;
        return;
      }
      const merged = added.concat(prev);
      oldestLoaded.current = merged[0].time;
      setBars(merged);
      // The viewport is anchored to the NEWEST bar, so prepending history
      // shifts every index. Push `offset` by the number of bars added to keep
      // the same candles under the user's finger...
      setView((v) => ({ ...v, offset: v.offset + added.length }));
      // ...and push the gesture's own anchor too. The pan recomputes its
      // offset from the value captured at touch-down on every move, so
      // without this the chart would snap back the instant more history
      // arrived mid-drag.
      gestureStart.current = {
        ...gestureStart.current,
        offset: gestureStart.current.offset + added.length,
      };
    } finally {
      loadingMore.current = false;
    }
  }, [barSeconds, fetchBars]);

  // ── Live prices ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof webSocketService?.onPriceUpdate !== 'function') return undefined;
    const unsub = webSocketService.onPriceUpdate((msg) => {
      if (!msg) return;
      const s = String(msg.symbol || msg.s || '').toUpperCase();
      if (s !== sym) return;
      const bid = Number(msg.bid);
      const ask = Number(msg.ask);
      // Charts are drawn on the mid, matching the bars endpoint, so the live
      // candle cannot disagree with the history it is extending.
      const price = Number.isFinite(bid) && Number.isFinite(ask)
        ? (bid + ask) / 2
        : (Number.isFinite(bid) ? bid : ask);
      if (!Number.isFinite(price)) return;
      setBars((prev) => applyTick(prev, {
        price,
        time: Math.floor(Date.now() / 1000),
        barSeconds,
      }));
    });
    webSocketService.connectPriceStream?.();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [sym, barSeconds]);

  // REST fallback. The socket is the primary path; this exists because a
  // silently dead socket is indistinguishable from a quiet market, and a
  // chart frozen for minutes is worse than one extra request every 5s.
  useEffect(() => {
    const id = setInterval(async () => {
      if (!barsRef.current.length) return;
      const to = Math.floor(Date.now() / 1000);
      const from = to - barSeconds * 3;
      const fresh = await fetchBars(from, to, { live: true });
      if (!fresh.length) return;
      setBars((prev) => {
        if (!prev.length) return prev;
        const byTime = new Map(prev.map((b) => [b.time, b]));
        let changed = false;
        for (const b of fresh) {
          const old = byTime.get(b.time);
          if (!old || old.close !== b.close || old.high !== b.high || old.low !== b.low) {
            byTime.set(b.time, b);
            changed = true;
          }
        }
        if (!changed) return prev;
        return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
      });
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [barSeconds, fetchBars]);

  // ── Open positions on this symbol ────────────────────────────────────
  const fetchPositions = useCallback(async () => {
    if (!accountId) { setPositions([]); return; }
    try {
      const url = `${API_URL}/positions/?account_id=${encodeURIComponent(accountId)}&status=open`;
      const r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) return;
      const raw = await r.json();
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
      setPositions(list.filter((p) => String(p.symbol).toUpperCase() === sym));
    } catch (e) { /* transient — the next poll covers it */ }
  }, [accountId, sym, authHeaders]);

  useEffect(() => {
    fetchPositions();
    const id = setInterval(fetchPositions, POSITION_POLL_MS);
    return () => clearInterval(id);
  }, [fetchPositions]);

  // The trade screen bumps `refreshTick` the moment an order fills. Poll once
  // immediately and once shortly after, so a new position's lines appear at
  // once instead of up to 3s later, and the second pull covers the backend's
  // brief write lag.
  useEffect(() => {
    if (refreshTick == null) return undefined;
    fetchPositions();
    const t = setTimeout(fetchPositions, 900);
    return () => clearTimeout(t);
  }, [refreshTick, fetchPositions]);

  const saveBracket = useCallback(async (positionId, kind, price) => {
    const body = kind === 'sl' ? { stop_loss: Number(price) } : { take_profit: Number(price) };
    try {
      await fetch(`${API_URL}/positions/${encodeURIComponent(positionId)}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      logger.error('chart: failed to save bracket', e);
    }
    // Re-read either way, so a rejected change snaps back to the server's
    // truth rather than leaving the line where the finger left it.
    fetchPositions();
  }, [authHeaders, fetchPositions]);

  // ── Layout + scales ──────────────────────────────────────────────────
  const plotWidth = Math.max(1, size.width - AXIS_WIDTH);
  const plotHeight = Math.max(1, size.height - TIME_HEIGHT);

  const range = useMemo(
    () => visibleRange(bars.length, view.count, view.offset),
    [bars.length, view.count, view.offset],
  );

  // Prices that must stay on screen even when they sit outside the candles'
  // own high/low — otherwise a stop dragged past the visible range would
  // leave the chart and become impossible to grab again.
  const levelPrices = useMemo(() => {
    const out = [];
    for (const p of positions) {
      out.push(Number(p.open_price));
      if (p.stop_loss != null) out.push(Number(p.stop_loss));
      if (p.take_profit != null) out.push(Number(p.take_profit));
    }
    return out.filter(Number.isFinite);
  }, [positions]);

  const liveBounds = useMemo(
    () => priceBounds(bars, range.start, range.end, levelPrices),
    [bars, range.start, range.end, levelPrices],
  );

  // The vertical scale is FROZEN for the duration of an SL/TP drag.
  //
  // Without this the chart chases itself: the dragged price widens the price
  // bounds, the wider bounds move every pixel including the line under the
  // finger, which changes the price, which widens the bounds again. Freezing
  // means a drag can only reach the edges of the chart as the user sees it —
  // predictable, and the clamp below makes that a hard stop rather than a
  // surprise.
  const frozenBounds = useRef(null);
  const { min, max } = dragging && frozenBounds.current
    ? frozenBounds.current
    : liveBounds;

  const scales = useMemo(
    () => makeScales({ plotWidth, plotHeight, count: range.count, min, max }),
    [plotWidth, plotHeight, range.count, min, max],
  );
  scalesRef.current = scales;
  plotHeightRef.current = plotHeight;
  if (!dragging) frozenBounds.current = { min, max };

  /** Current price of a level, preferring an in-flight drag over the server. */
  const levelPrice = useCallback((pos, kind) => {
    const id = String(pos.id || pos._id);
    if (dragging && dragging.id === id && dragging.kind === kind) return dragging.price;
    const raw = kind === 'sl' ? pos.stop_loss : kind === 'tp' ? pos.take_profit : pos.open_price;
    return raw == null ? null : Number(raw);
  }, [dragging]);

  const levels = useMemo(() => {
    const out = [];
    for (const p of positions) {
      const id = String(p.id || p._id);
      const entry = levelPrice(p, 'entry');
      if (Number.isFinite(entry)) {
        out.push({ key: `e${id}`, price: entry, color: vantage.accent, dashed: true });
      }
      const sl = levelPrice(p, 'sl');
      if (Number.isFinite(sl)) {
        out.push({ key: `s${id}`, price: sl, color: vantage.downFill, dashed: true });
      }
      const tp = levelPrice(p, 'tp');
      if (Number.isFinite(tp)) {
        out.push({ key: `t${id}`, price: tp, color: vantage.upFill, dashed: true });
      }
    }
    return out;
  }, [positions, levelPrice]);

  // ── Gestures ─────────────────────────────────────────────────────────
  const beginGesture = useCallback(() => {
    gestureStart.current = { ...viewRef.current };
    onDrag?.(true);
  }, [onDrag]);

  const endGesture = useCallback(() => { onDrag?.(false); }, [onDrag]);

  const panGesture = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .onBegin(beginGesture)
    .onUpdate((e) => {
      const total = barsRef.current.length;
      if (!total || plotWidth <= 0) return;
      const barWidth = plotWidth / Math.max(1, gestureStart.current.count);
      // Dragging right (positive translation) walks back into history.
      const shift = Math.round(e.translationX / barWidth);
      const maxOffset = Math.max(0, total - gestureStart.current.count);
      const next = clamp(gestureStart.current.offset + shift, 0, maxOffset);
      setView((v) => (v.offset === next ? v : { ...v, offset: next }));
      // Within one screen of the oldest bar we hold — start fetching more so
      // the data is there before the user reaches the edge.
      if (next >= maxOffset - gestureStart.current.count) loadOlder();
    })
    .onFinalize(endGesture),
  [beginGesture, endGesture, plotWidth, loadOlder]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .runOnJS(true)
    .onBegin(beginGesture)
    .onUpdate((e) => {
      if (!e.scale) return;
      const next = clamp(
        Math.round(gestureStart.current.count / e.scale),
        MIN_VISIBLE,
        MAX_VISIBLE,
      );
      setView((v) => (v.count === next ? v : { ...v, count: next }));
    })
    .onFinalize(endGesture),
  [beginGesture, endGesture]);

  // Long-press to summon the crosshair, then drag it. Declared Exclusive with
  // the pan below so a normal swipe still scrolls: the crosshair only wins
  // once the hold has elapsed.
  const crosshairGesture = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(220)
    // onStart, not onBegin: `onBegin` fires the moment a finger lands, before
    // the long-press delay has decided whether this is a crosshair or a
    // scroll. Using it would flash the crosshair on every ordinary swipe.
    .onStart((e) => { onDrag?.(true); setCrosshair({ x: e.x, y: e.y }); })
    .onUpdate((e) => {
      setCrosshair({
        x: clamp(e.x, 0, plotWidth),
        y: clamp(e.y, 0, plotHeight),
      });
    })
    .onFinalize(() => { setCrosshair(null); onDrag?.(false); }),
  [onDrag, plotWidth, plotHeight]);

  const composed = useMemo(
    () => Gesture.Simultaneous(
      pinchGesture,
      Gesture.Exclusive(crosshairGesture, panGesture),
    ),
    [pinchGesture, crosshairGesture, panGesture],
  );

  /**
   * Pan gesture for one draggable SL/TP chip.
   *
   * Cached per (position, kind) and never rebuilt: a GestureDetector handed a
   * new gesture object mid-drag loses the drag, and this component re-renders
   * on every pointer move. Everything that changes between renders — the
   * scale, the chip's current price — is read from a ref when the gesture
   * fires instead of being closed over when it is built.
   */
  const digitsRef = useRef(digits);
  digitsRef.current = digits;
  const saveBracketRef = useRef(saveBracket);
  saveBracketRef.current = saveBracket;

  const bracketGesture = useCallback((positionId, kind) => {
    const key = `${positionId}:${kind}`;
    const cached = bracketGestures.current.get(key);
    if (cached) return cached;
    const gesture = Gesture.Pan()
      .runOnJS(true)
      .onBegin(() => {
        const price = chipPriceRef.current[key];
        if (!Number.isFinite(price) || !scalesRef.current) return;
        dragStartYRef.current = scalesRef.current.y(price);
        onDragRef.current?.(true);
        setDragging({ id: positionId, kind, price });
      })
      .onUpdate((e) => {
        if (!scalesRef.current) return;
        const y = clamp(
          dragStartYRef.current + e.translationY,
          0,
          plotHeightRef.current,
        );
        setDragging({ id: positionId, kind, price: scalesRef.current.priceAt(y) });
      })
      .onEnd(() => {
        setDragging((d) => {
          if (d) saveBracketRef.current(d.id, d.kind, Number(d.price.toFixed(digitsRef.current)));
          return null;
        });
      })
      .onFinalize(() => { onDragRef.current?.(false); });
    bracketGestures.current.set(key, gesture);
    return gesture;
  }, []);

  // Drop cached gestures for positions that have closed, so the map does not
  // grow for the lifetime of the screen.
  useEffect(() => {
    const live = new Set();
    for (const p of positions) {
      const id = String(p.id || p._id);
      live.add(`${id}:sl`);
      live.add(`${id}:tp`);
    }
    for (const key of Array.from(bracketGestures.current.keys())) {
      if (!live.has(key)) bracketGestures.current.delete(key);
    }
  }, [positions]);

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
  }, []);

  const hoveredBar = crosshair && range.count > 0
    ? bars[range.start + clamp(scales.indexAt(crosshair.x), 0, range.count - 1)]
    : null;

  const ready = size.width > 0 && size.height > 0 && bars.length > 0;

  return (
    <View style={styles.wrap}>
      {showTimeframes ? (
        <View style={styles.tfRow}>
          {TIMEFRAMES.map((t) => {
            const active = t.res === res;
            return (
              <Pressable
                key={t.res}
                onPress={() => onIntervalChange?.(t.res)}
                disabled={!onIntervalChange}
                style={[styles.tfChip, active && styles.tfChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t.label} timeframe`}
              >
                <Text style={[styles.tfText, active && styles.tfTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.plot} onLayout={onLayout}>
        {ready ? (
          <GestureDetector gesture={composed}>
            <View style={StyleSheet.absoluteFill}>
              <CandleCanvas
                bars={bars}
                start={range.start}
                end={range.end}
                width={size.width}
                height={size.height}
                min={min}
                max={max}
                digits={digits}
                barSeconds={barSeconds}
                levels={levels}
                crosshair={crosshair}
                chartType={chartType}
              />
            </View>
          </GestureDetector>
        ) : null}

        {/* Position chips sit above the SVG as real views so they have real
            touch targets — hit-testing a 1px line inside an SVG is not a
            thing a thumb can do. */}
        {ready ? positions.map((p) => {
          const id = String(p.id || p._id);
          const rows = [
            { kind: 'entry', price: levelPrice(p, 'entry'), color: vantage.accent },
            { kind: 'sl', price: levelPrice(p, 'sl'), color: vantage.downFill },
            { kind: 'tp', price: levelPrice(p, 'tp'), color: vantage.upFill },
          ];
          return rows.map((row) => {
            if (!Number.isFinite(row.price) || row.price < min || row.price > max) return null;
            chipPriceRef.current[`${id}:${row.kind}`] = row.price;
            const top = scales.y(row.price) - 11;
            const pnl = Number(p.profit);
            const chip = (
              <View style={[styles.chip, { borderColor: row.color }]}>
                <Text style={[styles.chipLabel, { color: row.color }]}>
                  {row.kind === 'entry'
                    ? `${String(p.side || '').toUpperCase()} ${p.lots}`
                    : row.kind.toUpperCase()}
                </Text>
                {row.kind === 'entry' && Number.isFinite(pnl) ? (
                  <Text style={[styles.chipPnl, { color: pnl >= 0 ? vantage.up : vantage.down }]}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                  </Text>
                ) : null}
                {row.kind === 'entry' ? (
                  <Pressable
                    onPress={() => onClosePosition?.(id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Close ${p.side} position on ${sym}`}
                  >
                    <Ionicons name="close" size={12} color={vantage.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
            );
            // The entry line is where the trade opened — it is history, not a
            // setting, so it is shown but not draggable. Only SL and TP are.
            return (
              <View key={`${id}${row.kind}`} style={[styles.chipWrap, { top }]} pointerEvents="box-none">
                {row.kind === 'entry' ? chip : (
                  <GestureDetector gesture={bracketGesture(id, row.kind)}>
                    {chip}
                  </GestureDetector>
                )}
              </View>
            );
          });
        }) : null}

        {/* Crosshair readout. Top-left, where it never sits under the thumb. */}
        {hoveredBar ? (
          <View style={styles.readout} pointerEvents="none">
            <Text style={styles.readoutTime}>
              {formatBarTime(hoveredBar.time, barSeconds, { withDate: true })}
            </Text>
            <View style={styles.readoutRow}>
              <Ohlc label="O" value={hoveredBar.open} digits={digits} />
              <Ohlc label="H" value={hoveredBar.high} digits={digits} />
              <Ohlc label="L" value={hoveredBar.low} digits={digits} />
              <Ohlc
                label="C"
                value={hoveredBar.close}
                digits={digits}
                color={hoveredBar.close >= hoveredBar.open ? vantage.up : vantage.down}
              />
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={vantage.accent} />
          </View>
        ) : null}

        {!loading && failed ? (
          <View style={styles.overlay}>
            <Ionicons name="cellular-outline" size={26} color={vantage.textMuted} />
            <Text style={styles.emptyText}>No chart data for {sym}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Ohlc({ label, value, digits, color }) {
  return (
    <View style={styles.ohlc}>
      <Text style={styles.ohlcLabel}>{label}</Text>
      <Text style={[styles.ohlcValue, color ? { color } : null]}>
        {formatPrice(value, digits)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: vantage.bg },
  plot: { flex: 1, overflow: 'hidden' },

  tfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  tfChip: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: vantage.bgElevated,
  },
  tfChipActive: { backgroundColor: vantage.accentMuted },
  tfText: {
    fontFamily,
    fontSize: sizes.label,
    fontWeight: weights.medium,
    color: vantage.textSecondary,
  },
  tfTextActive: { color: vantage.accent, fontWeight: weights.bold },

  chipWrap: { position: 'absolute', left: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: vantage.bgElevated,
  },
  chipLabel: {
    fontFamily,
    fontSize: sizes.micro,
    fontWeight: weights.bold,
  },
  chipPnl: {
    fontFamily,
    fontSize: sizes.micro,
    fontWeight: weights.semibold,
    fontVariant: ['tabular-nums'],
  },

  readout: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    backgroundColor: vantage.bgElevated,
  },
  readoutTime: {
    fontFamily,
    fontSize: sizes.micro,
    color: vantage.textMuted,
    marginBottom: 2,
  },
  readoutRow: { flexDirection: 'row', gap: space.sm },
  ohlc: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ohlcLabel: { fontFamily, fontSize: sizes.micro, color: vantage.textMuted },
  ohlcValue: {
    fontFamily,
    fontSize: sizes.micro,
    color: vantage.textPrimary,
    fontVariant: ['tabular-nums'],
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: vantage.bg,
  },
  emptyText: {
    fontFamily,
    fontSize: sizes.label,
    color: vantage.textMuted,
  },
});
