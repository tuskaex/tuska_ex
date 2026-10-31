'use client';

/**
 * Live chart preview of a converted (draft) indicator, on real candles from the
 * gateway (`/api/v1/instruments/{symbol}/bars`, rewritten to the gateway by
 * next.config). The library comes from the trader frontend's copy through
 * src/app/charting_library/[...path]/route.ts.
 *
 * The widget is rebuilt whenever the code or symbol changes: custom indicators
 * are registered once, at construction.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { buildCustomIndicators } from '@/lib/customIndicators';

const LIBRARY_SRC = '/charting_library/charting_library.standalone.js';
const CONTAINER_ID = 'indicator-preview-chart';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView?: any;
  }
}

let libraryPromise: Promise<void> | null = null;
function loadLibrary(): Promise<void> {
  if (window.TradingView) return Promise.resolve();
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LIBRARY_SRC;
    s.async = true;
    s.onload = () => (window.TradingView ? resolve() : reject(new Error('no TradingView global')));
    s.onerror = () => reject(new Error('library load error'));
    document.head.appendChild(s);
  }).catch((e) => {
    libraryPromise = null;
    throw e;
  });
  return libraryPromise;
}

const RESOLUTION_SECONDS: Record<string, number> = {
  '1': 60, '5': 300, '15': 900, '30': 1800, '60': 3600, '240': 14400, '1D': 86400,
};

function pricescaleFor(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes('JPY')) return 1000;
  if (/^(XAU|XAG|US30|NAS|SPX|GER|UK100|BTC|ETH)/.test(s)) return 100;
  return 100000;
}

function makeDatafeed() {
  return {
    onReady: (cb: (c: unknown) => void) =>
      setTimeout(() => cb({ supported_resolutions: Object.keys(RESOLUTION_SECONDS) })),
    searchSymbols: (_q: string, _e: string, _t: string, cb: (r: unknown[]) => void) => cb([]),
    resolveSymbol: (name: string, ok: (s: unknown) => void) => {
      setTimeout(() => ok({
        name, ticker: name, description: name, type: 'forex', session: '24x7',
        timezone: 'Etc/UTC', exchange: 'Preview', listed_exchange: 'Preview', format: 'price',
        minmov: 1, pricescale: pricescaleFor(name), has_intraday: true, has_daily: true,
        supported_resolutions: Object.keys(RESOLUTION_SECONDS), volume_precision: 0,
        data_status: 'endofday',
      }));
    },
    getBars: async (
      si: { name: string },
      resolution: string,
      p: { from: number; to: number; firstDataRequest: boolean },
      ok: (bars: unknown[], meta: { noData: boolean }) => void,
      fail: (e: string) => void,
    ) => {
      try {
        const url = `/api/v1/instruments/${encodeURIComponent(si.name)}/bars`
          + `?resolution=${encodeURIComponent(resolution)}&from=${p.from}&to=${p.to}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const raw = await r.json();
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.bars) ? raw.bars : []);
        const bars = list
          .map((b: Record<string, unknown>) => ({
            time: Number(b.time) * 1000,
            open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close),
            volume: Number(b.volume ?? 0),
          }))
          .filter((b: { time: number; close: number }) => Number.isFinite(b.time) && Number.isFinite(b.close))
          .sort((a: { time: number }, b: { time: number }) => a.time - b.time);
        ok(bars, { noData: bars.length === 0 });
      } catch (e) {
        fail(e instanceof Error ? e.message : 'bars failed');
      }
    },
    subscribeBars: () => {},
    unsubscribeBars: () => {},
  };
}

export function IndicatorPreview({
  name, studyId, js, symbol, resolution,
}: {
  name: string;
  studyId: string;
  js: string;
  symbol: string;
  resolution: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetRef = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setState('loading');
    setError(null);
    (async () => {
      try {
        await loadLibrary();
      } catch {
        if (!disposed) {
          setState('error');
          setError('Chart library not reachable. The preview loads it from the trader frontend (TRADER_FRONTEND_INTERNAL_URL).');
        }
        return;
      }
      if (disposed) return;
      const row = { study_id: `preview_${studyId}`, name, js };
      let buildError: string | null = null;
      const widget = new window.TradingView.widget({
        container: CONTAINER_ID,
        library_path: '/charting_library/',
        datafeed: makeDatafeed(),
        symbol,
        interval: resolution,
        autosize: true,
        locale: 'en',
        timezone: 'Etc/UTC',
        theme: document.documentElement.classList.contains('light') ? 'light' : 'dark',
        disabled_features: ['use_localstorage_for_settings', 'header_symbol_search', 'header_compare'],
        custom_indicators_getter: (PineJS: unknown) => Promise.resolve(
          buildCustomIndicators(PineJS, [row], (_r, e) => {
            buildError = e instanceof Error ? e.message : String(e);
          }),
        ),
      });
      widgetRef.current = widget;
      widget.onChartReady(async () => {
        if (disposed) return;
        if (buildError) {
          setState('error');
          setError(`The converted code failed to load: ${buildError}`);
          return;
        }
        try {
          await widget.activeChart().createStudy(name, false, false);
          setState('ready');
        } catch (e) {
          setState('error');
          setError(`The chart rejected the indicator: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    })();
    return () => {
      disposed = true;
      try { widgetRef.current?.remove(); } catch { /* already gone */ }
      widgetRef.current = null;
    };
  }, [name, studyId, js, symbol, resolution]);

  return (
    <div className="relative h-[460px] rounded-md border border-border-primary overflow-hidden bg-bg-tertiary">
      <div id={CONTAINER_ID} className="absolute inset-0" />
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 size={20} className="animate-spin text-text-tertiary" />
        </div>
      )}
      {error && (
        <div className="absolute left-2 right-2 bottom-2 rounded-md bg-danger/15 border border-danger/30 text-danger text-xs px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
