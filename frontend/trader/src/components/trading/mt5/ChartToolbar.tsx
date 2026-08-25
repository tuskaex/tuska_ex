'use client';

/**
 * The MetaTrader chart toolbar.
 *
 * MT5 puts one strip above the chart carrying, left to right: New Order, chart
 * type, zoom, the timeframe row (M1…MN), then indicators and view toggles.
 * The charting library ships its own header with most of the same controls,
 * but it is laid out as a web chart — a search box, a wide "Indicators" word
 * button, undo/redo — and it is the single loudest "this is TradingView, not
 * MetaTrader" signal on the screen. So the library's header is disabled and
 * this strip drives the same widget through `ChartApi`.
 *
 * Everything here is best-effort by construction: `ChartApi` swallows library
 * failures and reports nothing back. That is deliberate — see its doc comment.
 * The consequence to know about is that a control can silently no-op if a
 * library upgrade renames an action id, so the timeframe buttons keep their
 * own local state rather than reading it back from the chart, and stay
 * correct as a UI even when the call under them did nothing.
 */

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  BarChart3,
  CandlestickChart,
  Crosshair,
  LineChart,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  Settings2,
  Sigma,
  TrendingUp,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ChartApi } from '@/components/charts/TradingViewChart';

/** MetaTrader's nine periods, mapped to charting-library resolutions. */
const TIMEFRAMES: { label: string; resolution: string; title: string }[] = [
  { label: 'M1', resolution: '1', title: '1 minute' },
  { label: 'M5', resolution: '5', title: '5 minutes' },
  { label: 'M15', resolution: '15', title: '15 minutes' },
  { label: 'M30', resolution: '30', title: '30 minutes' },
  { label: 'H1', resolution: '60', title: '1 hour' },
  { label: 'H4', resolution: '240', title: '4 hours' },
  { label: 'D1', resolution: '1D', title: '1 day' },
  { label: 'W1', resolution: '1W', title: '1 week' },
  { label: 'MN', resolution: '1M', title: '1 month' },
];

/* Library chart-type constants. Bars / Candles / Line are the three MT5
 * offers; the library has several more and none of them belong here. */
const CHART_TYPES = [
  { type: 0, label: 'Bars', Icon: BarChart3 },
  { type: 1, label: 'Candlesticks', Icon: CandlestickChart },
  { type: 2, label: 'Line', Icon: LineChart },
] as const;

interface ChartToolbarProps {
  api: ChartApi | null;
  /** The chart's starting resolution, so the strip is correct before first click. */
  initialResolution: string;
  symbol: string;
  onNewOrder: () => void;
  onToggleFullscreen: () => void;
  fullscreen: boolean;
  /** Market Watch dock visibility — MT5's View menu keeps this toggle. */
  marketWatchOpen: boolean;
  onToggleMarketWatch: () => void;
  toolboxOpen: boolean;
  onToggleToolbox: () => void;
}

export default function ChartToolbar({
  api,
  initialResolution,
  symbol,
  onNewOrder,
  onToggleFullscreen,
  fullscreen,
  marketWatchOpen,
  onToggleMarketWatch,
  toolboxOpen,
  onToggleToolbox,
}: ChartToolbarProps) {
  const [resolution, setResolution] = useState(initialResolution);
  const [chartType, setChartType] = useState(1);

  /* When the chart (re)mounts, adopt whatever it actually has rather than
   * asserting our own state onto it — the widget restores the last chart type
   * from its own saved state, and pushing ours over that would silently
   * discard the user's choice on every remount. */
  useEffect(() => {
    if (!api) return;
    const r = api.getResolution();
    if (r) setResolution(r);
    const t = api.getChartType();
    if (t != null) setChartType(t);
  }, [api]);

  const pickResolution = (r: string) => {
    setResolution(r);
    api?.setResolution(r);
  };

  const pickChartType = (t: number) => {
    setChartType(t);
    api?.setChartType(t);
  };

  return (
    <div className="mt5-toolbar">
      <button type="button" onClick={onNewOrder} className="mt5-tbtn" title={`New order — ${symbol} (F9)`}>
        <Plus className="w-3.5 h-3.5" aria-hidden />
        New Order
      </button>

      <span className="mt5-sep" />

      {CHART_TYPES.map(({ type, label, Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => pickChartType(type)}
          aria-pressed={chartType === type}
          className="mt5-tbtn"
          title={label}
          aria-label={label}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
        </button>
      ))}

      <span className="mt5-sep" />

      <button
        type="button"
        onClick={() => api?.zoom('in')}
        className="mt5-tbtn"
        title="Zoom in"
        aria-label="Zoom in"
      >
        <ZoomIn className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => api?.zoom('out')}
        className="mt5-tbtn"
        title="Zoom out"
        aria-label="Zoom out"
      >
        <ZoomOut className="w-3.5 h-3.5" aria-hidden />
      </button>

      <span className="mt5-sep" />

      {/* MetaTrader's cursor / drawing group. These map onto the charting
          library's own linetool actions rather than being re-implemented —
          the library already owns hit-testing, dragging and persistence for
          every object drawn on the chart, and a hand-rolled overlay would
          have none of it.

          `ChartApi.executeActionById` is fail-soft, so if a library upgrade
          renames one of these ids the button becomes inert rather than
          throwing. That is why the group carries no active state: it would
          be a lie the moment an id drifted. */}
      <button
        type="button"
        onClick={() => api?.executeActionById('cursorDefault')}
        className="mt5-tbtn"
        title="Cursor"
        aria-label="Cursor"
      >
        <MousePointer2 className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => api?.executeActionById('cursorCross')}
        className="mt5-tbtn"
        title="Crosshair"
        aria-label="Crosshair"
      >
        <Crosshair className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => api?.executeActionById('linetoolverticalline')}
        className="mt5-tbtn"
        title="Vertical line"
        aria-label="Vertical line"
      >
        <Minus className="w-3.5 h-3.5 rotate-90" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => api?.executeActionById('linetoolhorzline')}
        className="mt5-tbtn"
        title="Horizontal line"
        aria-label="Horizontal line"
      >
        <Minus className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => api?.executeActionById('linetooltrendline')}
        className="mt5-tbtn"
        title="Trend line"
        aria-label="Trend line"
      >
        <TrendingUp className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => api?.executeActionById('linetooltext')}
        className="mt5-tbtn"
        title="Text"
        aria-label="Text"
      >
        <Type className="w-3.5 h-3.5" aria-hidden />
      </button>

      <span className="mt5-sep" />

      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.label}
          type="button"
          onClick={() => pickResolution(tf.resolution)}
          aria-pressed={resolution === tf.resolution}
          className="mt5-tbtn"
          title={tf.title}
        >
          {tf.label}
        </button>
      ))}

      <span className="mt5-sep" />

      <button
        type="button"
        onClick={() => api?.executeActionById('insertIndicator')}
        className="mt5-tbtn"
        title="Indicators"
      >
        <Sigma className="w-3.5 h-3.5" aria-hidden />
        Indicators
      </button>
      <button
        type="button"
        onClick={() => api?.executeActionById('chartProperties')}
        className="mt5-tbtn"
        title="Chart properties"
        aria-label="Chart properties"
      >
        <Settings2 className="w-3.5 h-3.5" aria-hidden />
      </button>

      {/* MT5's View menu lives as toggles on the right of the strip. Pushed
          there with ml-auto so the timeframe row stays anchored left, where
          muscle memory expects it, however wide the window gets. */}
      <span className="ml-auto" />

      <button
        type="button"
        onClick={onToggleMarketWatch}
        aria-pressed={marketWatchOpen}
        className="mt5-tbtn"
        title="Market Watch (Ctrl+M)"
      >
        Market Watch
      </button>
      <button
        type="button"
        onClick={onToggleToolbox}
        aria-pressed={toolboxOpen}
        className="mt5-tbtn"
        title="Toolbox (Ctrl+T)"
      >
        Toolbox
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-pressed={fullscreen}
        className={clsx('mt5-tbtn')}
        title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen (F11)'}
        aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
      >
        <Maximize2 className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  );
}
