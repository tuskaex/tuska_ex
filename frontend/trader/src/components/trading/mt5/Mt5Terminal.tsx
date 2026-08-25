'use client';

/**
 * The desktop trading terminal, laid out as MetaTrader 5.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ brand · account                              menu strip  │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ New Order │ ▮ ▯ ∿ │ ± │ M1 M5 … MN │ Indicators │ View   │  toolbar
 *   ├───────────────┬──────────────────────────────────────────┤
 *   │ Market Watch  │                                          │
 *   │ Symbol Bid Ask│                 chart                    │
 *   │ …             │                                          │
 *   │ Sym|Det|Trd|Tk│ XAUUSD,M5 │ EURUSD,M5 │                  │  chart tabs
 *   ├───────────────┴──────────────────────────────────────────┤
 *   │ Trade │ History │ News │ Journal                         │  toolbox
 *   │ …positions… Balance 31 813.93  Equity …  Free margin …   │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ account · positions            market open · clock · ●   │  status
 *   └──────────────────────────────────────────────────────────┘
 *
 * ── What changed and why ───────────────────────────────────────────────
 * The previous shell was chart-first: a full-width chart with the quote list
 * behind a right-hand drawer toggle and the blotter in a strip below. That
 * inverts how the panels are actually used — the quote list is what a trader
 * keeps on screen and the chart is what they change — and it is the reason
 * the terminal did not read as a trading platform. Market Watch is now docked
 * left and always present, and the blotter became the Toolbox: tabbed, with
 * the account summary as a row inside it rather than cards floating above.
 *
 * ── Sizing ─────────────────────────────────────────────────────────────
 * Dock sizes reuse the two persisted uiStore fields (`orderPanelWidth` for
 * Market Watch, `bottomPanelHeight` for the Toolbox) rather than introducing
 * new ones. Their clamps already suit the new roles (250–560px, ≥160px), and
 * reusing them means a trader's layout survives this redesign instead of
 * being reset to defaults on the deploy that ships it.
 *
 * ── Mobile ─────────────────────────────────────────────────────────────
 * Not this component. The phone layout stays in the terminal page: a 220px
 * dock and an 11-column blotter have no phone equivalent, and MT5's own
 * mobile app is a different design, not a squeezed desktop one.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useTradingStore } from '@/stores/tradingStore';
import { useUIStore } from '@/stores/uiStore';
import { TERMINAL_RESIZE, maxBottomPanelHeightPx } from '@/lib/terminalLayout';
import journal from '@/lib/terminalJournal';
import PanelResizeHandle from '@/components/trading/PanelResizeHandle';
import DraggableOrderModal from '@/components/trading/DraggableOrderModal';
import TerminalBrandMenu from '@/components/trading/TerminalBrandMenu';
import { ActiveAccountBadge } from '@/components/trading/ActiveAccountBadge';
import { ChartErrorBoundary } from '@/components/charts/ChartErrorBoundary';
import type { ChartApi } from '@/components/charts/TradingViewChart';
import MarketWatch from './MarketWatch';
import Toolbox, { type ToolboxTab } from './Toolbox';
import ChartToolbar from './ChartToolbar';
import StatusBar from './StatusBar';

const TradingViewChart = dynamic(() => import('@/components/charts/TradingViewChart'), { ssr: false });

/** Matches the chart's own default for this route (see TradingViewChart). */
const DEFAULT_RESOLUTION = '5';

/** Timeframe label for the chart tabs — MT5 writes them as "XAUUSD,M5". */
const TF_LABEL: Record<string, string> = {
  '1': 'M1',
  '5': 'M5',
  '15': 'M15',
  '30': 'M30',
  '60': 'H1',
  '240': 'H4',
  '1D': 'D1',
  '1W': 'W1',
  '1M': 'MN',
};

export default function Mt5Terminal() {
  const selectedSymbol = useTradingStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useTradingStore((s) => s.setSelectedSymbol);
  const activeAccount = useTradingStore((s) => s.activeAccount);

  const orderPanelWidth = useUIStore((s) => s.orderPanelWidth);
  const bottomPanelHeight = useUIStore((s) => s.bottomPanelHeight);
  const setOrderPanelWidth = useUIStore((s) => s.setOrderPanelWidth);
  const setBottomPanelHeight = useUIStore((s) => s.setBottomPanelHeight);

  /* Local mirrors of the persisted sizes. A drag writes both: local for the
   * frame being painted, the store so the size outlives the session. Reading
   * the store alone during a drag would re-render every subscriber on every
   * pointer move. */
  const [mwWidth, setMwWidth] = useState(orderPanelWidth);
  const [tbHeight, setTbHeight] = useState(bottomPanelHeight);
  useEffect(() => setMwWidth(orderPanelWidth), [orderPanelWidth]);
  useEffect(() => setTbHeight(bottomPanelHeight), [bottomPanelHeight]);

  const [mwOpen, setMwOpen] = useState(true);
  const [tbOpen, setTbOpen] = useState(true);
  const [toolboxTab, setToolboxTab] = useState<ToolboxTab>('trade');
  const [orderOpen, setOrderOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chartApi, setChartApi] = useState<ChartApi | null>(null);
  /* The chart tab strip. One widget is mounted and the tabs switch its
   * symbol — MetaTrader opens a separate chart per tab, but a second copy of
   * a 26 MB library per tab is not a trade worth making, and switching is the
   * behaviour a trader is actually reaching for. */
  const [chartTabs, setChartTabs] = useState<string[]>([]);
  const [resolution, setResolution] = useState(DEFAULT_RESOLUTION);

  const centerRef = useRef<HTMLDivElement>(null);
  /* Snapshot at pointer-down so the clamps stay stable while the store
   * updates underneath the drag. */
  const dragStart = useRef({ w: 0, h: 0, vw: 0, colH: 0 });

  const snapshot = useCallback(() => {
    const rect = centerRef.current?.getBoundingClientRect();
    dragStart.current = {
      w: useUIStore.getState().orderPanelWidth,
      h: useUIStore.getState().bottomPanelHeight,
      vw: typeof window !== 'undefined' ? window.innerWidth : 0,
      colH: Math.max(120, rect?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 0)),
    };
  }, []);

  const onMarketWatchDrag = useCallback(
    (dx: number) => {
      const { w, vw } = dragStart.current;
      /* 250..560 mirrors setOrderPanelWidth's own clamp. Allowing a narrower
       * drag here would look like it worked and then snap back on the next
       * store sync — the store would have stored 250 while the local mirror
       * held 180, and the effect that follows the store would win. */
      const max = Math.min(560, vw - TERMINAL_RESIZE.handlesSlack - TERMINAL_RESIZE.chartMinWidth);
      const next = Math.max(250, Math.min(max, w + dx));
      setMwWidth(next);
      setOrderPanelWidth(next);
    },
    [setOrderPanelWidth],
  );

  const onToolboxDrag = useCallback(
    (dy: number) => {
      const { h, colH } = dragStart.current;
      /* 160 is setBottomPanelHeight's floor — same snap-back reasoning as the
       * width clamp above. */
      const next = Math.max(160, Math.min(maxBottomPanelHeightPx(colH), h - dy));
      setTbHeight(next);
      setBottomPanelHeight(next);
    },
    [setBottomPanelHeight],
  );

  const openOrder = useCallback(
    (symbol?: string) => {
      if (symbol) setSelectedSymbol(symbol);
      setOrderOpen(true);
    },
    [setSelectedSymbol],
  );

  /* Keep a tab for every symbol the trader has looked at this session, the
   * way MetaTrader keeps a chart window open until you close it. */
  useEffect(() => {
    if (!selectedSymbol) return;
    setChartTabs((prev) => (prev.includes(selectedSymbol) ? prev : [...prev, selectedSymbol]));
  }, [selectedSymbol]);

  /* Track the chart's resolution for the tab labels. The toolbar owns the
   * setter, so this only has to hear about it. */
  useEffect(() => {
    if (!chartApi) return;
    const r = chartApi.getResolution();
    if (r) setResolution(r);
  }, [chartApi]);

  /* MetaTrader's shortcuts, for the three things worth reaching for without
   * the mouse. Ignored while focus is in a text field — F9 in the order
   * ticket's volume box must type, not re-open the ticket. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
        return;
      }
      if (typing) return;
      if (e.key === 'F9') {
        e.preventDefault();
        openOrder();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMwOpen((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTbOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, openOrder]);

  /* One line so the Journal is not empty on a fresh session, and so a trader
   * comparing it against their broker's server log has a start marker. */
  useEffect(() => {
    journal.log('Terminal', 'Terminal started');
  }, []);

  const closeTab = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setChartTabs((prev) => {
      const next = prev.filter((s) => s !== symbol);
      /* Closing the active tab moves to the last remaining one. Closing the
       * only tab leaves the chart where it is — MetaTrader has no
       * chartless state and neither should this. */
      if (symbol === selectedSymbol && next.length > 0) setSelectedSymbol(next[next.length - 1]!);
      return next.length > 0 ? next : prev;
    });
  };

  const tfLabel = TF_LABEL[resolution] ?? resolution;

  return (
    /* `mt5` turns on the MetaTrader chrome (styles/mt5.css); the light theme
     * is pinned alongside it because that palette is defined in light values
     * only — a dark wrapper would otherwise leave half-themed descendants
     * that the `.mt5` block does not name. */
    <div
      className="mt5 theme-light flex h-full min-h-0 w-full flex-col overflow-hidden"
      data-theme="light"
    >
      {/* Menu strip — MetaTrader's File/Edit/View row. Here it carries the
          thing that row cannot: whose platform this is. On a white-label
          tenant that mark and name are theirs, and the terminal is where
          their client spends the session. */}
      <div className="mt5-caption !h-7 gap-3">
        <TerminalBrandMenu />
        <span className="mt5-sep" />
        {activeAccount ? (
          <ActiveAccountBadge account={activeAccount} variant="compact" />
        ) : (
          <span className="text-text-tertiary">No account</span>
        )}
      </div>

      <ChartToolbar
        api={chartApi}
        initialResolution={DEFAULT_RESOLUTION}
        symbol={selectedSymbol}
        onNewOrder={() => openOrder()}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
        fullscreen={fullscreen}
        marketWatchOpen={mwOpen}
        onToggleMarketWatch={() => setMwOpen((v) => !v)}
        toolboxOpen={tbOpen}
        onToggleToolbox={() => setTbOpen((v) => !v)}
      />

      <div ref={centerRef} className="flex min-h-0 flex-1 overflow-hidden">
        {mwOpen && !fullscreen && (
          <>
            <div className="shrink-0 min-h-0" style={{ width: mwWidth }}>
              <MarketWatch onNewOrder={openOrder} onClose={() => setMwOpen(false)} />
            </div>
            <PanelResizeHandle
              axis="vertical"
              hitSize={TERMINAL_RESIZE.handleHitPx}
              onDragStart={snapshot}
              onDrag={onMarketWatchDrag}
            />
          </>
        )}

        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={clsx(
              'flex min-h-0 min-w-0 flex-col overflow-hidden bg-bg-primary',
              fullscreen ? 'fixed inset-0 z-[100]' : 'flex-1',
            )}
          >
            {fullscreen && (
              <div className="mt5-caption">
                <span className="flex-1 truncate">
                  {selectedSymbol}, {tfLabel}
                </span>
                <span className="text-text-tertiary">Esc — restore</span>
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="mt5-tbtn !min-w-0 !h-4 !px-1"
                  aria-label="Exit full screen"
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              </div>
            )}
            <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
              <ChartErrorBoundary>
                <TradingViewChart
                  theme="light"
                  hideNativeHeader
                  onChartApi={setChartApi}
                  onRequestFullscreen={() => setFullscreen(true)}
                />
              </ChartErrorBoundary>
            </div>

            {/* Chart tabs, bottom-anchored the way MetaTrader anchors them.
                Select and close are two sibling buttons inside the tab rather
                than a close nested in the select: a button inside a button is
                invalid HTML, and browsers resolve it by dropping one of the
                two click targets — which one varies. */}
            <div className="mt5-tabs" aria-label="Open charts">
              {chartTabs.map((symbol) => (
                <span
                  key={symbol}
                  className="mt5-tab"
                  aria-selected={symbol === selectedSymbol}
                  data-symbol={symbol}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(symbol)}
                    className="bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                  >
                    {symbol},{tfLabel}
                  </button>
                  {chartTabs.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Close ${symbol} chart`}
                      title={`Close ${symbol} chart`}
                      onClick={(e) => closeTab(e, symbol)}
                      className="bg-transparent border-0 p-0 cursor-pointer text-text-tertiary hover:text-sell"
                    >
                      <X className="w-2.5 h-2.5" aria-hidden />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {tbOpen && !fullscreen && (
            <>
              <PanelResizeHandle
                axis="horizontal"
                hitSize={TERMINAL_RESIZE.bottomHandleHitPx}
                onDragStart={snapshot}
                onDrag={onToolboxDrag}
              />
              <div className="shrink-0 min-h-0" style={{ height: tbHeight }}>
                <Toolbox tab={toolboxTab} onTabChange={setToolboxTab} />
              </div>
            </>
          )}
        </div>
      </div>

      {!fullscreen && <StatusBar symbol={selectedSymbol} />}

      {orderOpen && (
        <DraggableOrderModal
          onClose={() => {
            setOrderOpen(false);
            /* Anything placed lands in the Trade tab; switching to it is what
             * MetaTrader does on a fill and saves the trader hunting for
             * confirmation that the order exists. */
            setToolboxTab('trade');
            setTbOpen(true);
          }}
        />
      )}
    </div>
  );
}
