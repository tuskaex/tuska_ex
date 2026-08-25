'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { Minimize2, Search } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useTradingStore, InstrumentInfo } from '@/stores/tradingStore';
import toast from 'react-hot-toast';
import { sounds, unlockAudio } from '@/lib/sounds';
import { getMarketStatus } from '@/lib/marketHours';
import { setPersistedTradingAccountId, tradingTerminalUrl } from '@/lib/tradingNav';
import Watchlist from '@/components/trading/Watchlist';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import PositionsPanel from '@/components/trading/PositionsPanel';
import OrderPanel from '@/components/trading/OrderPanel';
import { ActiveAccountBadge } from '@/components/trading/ActiveAccountBadge';
import AppNavbar from '@/components/layout/AppNavbar';
import Mt5Terminal from '@/components/trading/mt5/Mt5Terminal';

const TradingViewChart = dynamic(() => import('@/components/charts/TradingViewChart'), { ssr: false });
import { ChartErrorBoundary } from '@/components/charts/ChartErrorBoundary';
const TradingViewNewsTimeline = dynamic(() => import('@/components/charts/TradingViewNewsTimeline'), {
  ssr: false,
});

/**
 * The terminal route, which is really two terminals.
 *
 * Desktop renders <Mt5Terminal/> — the MetaTrader 5 layout, in
 * components/trading/mt5/. Everything in THIS file below the `isMobile`
 * branch is the phone terminal: a single chart with a Sell/Buy bar, an order
 * sheet, and the watchlist / trades / news reached through the `view` query
 * param rather than docks.
 *
 * The split is by width at 768px and is decided before either tree mounts, so
 * neither layout pays for the other. It is also why the desktop panel state
 * that used to live here is gone: it belonged to a layout this file no longer
 * draws.
 */
export default function TradingTerminalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account');

  useDocumentTitle();

  const [isMobile, setIsMobile] = useState(false);
  const [chartExpanded, setChartExpanded] = useState(false);
  // Mobile had no order ticket at all — only the market Sell/Buy pair under the
  // chart. Stop loss, take profit, pending orders and the margin estimate were
  // desktop-only, so a phone could open a position but not protect it.
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);
  const [lotSize, setLotSize] = useState('0.01');
  const [chartTabs, setChartTabs] = useState<string[]>([]);
  // orderSubmitting removed — MT5-style: never block rapid-fire clicks
  const [mobileSymbolSearch, setMobileSymbolSearch] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Narrow selectors: only re-render on the slices this page actually reads
  // (action references are stable in zustand, so selecting them is free).
  const selectedSymbol = useTradingStore((s) => s.selectedSymbol);
  // Passed to the chart so the library's own canvas follows the app theme;
  // without it the widget stays on its 'light' default while everything
  // around it goes dark.
  const chartTheme = useUIStore((s) => s.theme);
  const prices = useTradingStore((s) => s.prices);
  const instruments = useTradingStore((s) => s.instruments);
  const setSelectedSymbol = useTradingStore((s) => s.setSelectedSymbol);
  const activeAccount = useTradingStore((s) => s.activeAccount);
  const placeOrder = useTradingStore((s) => s.placeOrder);

  const instrumentInfo = instruments.find((i: InstrumentInfo) => i.symbol === selectedSymbol);
  const mobileMarketStatus = getMarketStatus(selectedSymbol, (instrumentInfo as any)?.segment);
  /** Default `chart` so Trade opens chart + buy/sell (not symbol list only). Watchlist tab still passes view=watchlist. */
  const mobileView = searchParams.get('view') || 'chart';

  useEffect(() => {
    if (accountId) setPersistedTradingAccountId(accountId);
  }, [accountId]);

  useEffect(() => {
    if (!accountId) router.replace('/trading');
  }, [accountId, router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!chartExpanded || !isMobile) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [chartExpanded, isMobile]);

  useEffect(() => {
    if (!chartExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setChartExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chartExpanded]);

  // Sync selected symbol with tabs — use functional update to avoid stale closure duplicates
  useEffect(() => {
    if (selectedSymbol) {
      setChartTabs(prev => prev.includes(selectedSymbol) ? prev : [...prev, selectedSymbol]);
    }
  }, [selectedSymbol]);

  const removeTab = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const nextTabs = chartTabs.filter(s => s !== symbol);
    setChartTabs(nextTabs);
    if (selectedSymbol === symbol && nextTabs.length > 0) {
      // nextTabs[last] safe inside length>0 guard.
      setSelectedSymbol(nextTabs[nextTabs.length - 1]!);
    }
  };

  if (!accountId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0 bg-bg-base">
        <p className="text-sm text-text-tertiary">Choose an account to trade…</p>
      </div>
    );
  }

  if (isMobile) {
    const digits = instruments.find((i: InstrumentInfo) => i.symbol === selectedSymbol)?.digits ?? 5;
    const price = prices[selectedSymbol];

    const handleLotChange = (val: number) => {
      const current = parseFloat(lotSize) || 0;
      const next = Math.max(0.01, +(current + val).toFixed(2));
      setLotSize(next.toFixed(2));
    };

    const placeMarketOrder = (side: 'buy' | 'sell') => {
      unlockAudio();
      if (!activeAccount) {
        toast.error('No account selected');
        return;
      }
      if (!mobileMarketStatus.isOpen) {
        toast.error(mobileMarketStatus.reason || 'Market is closed');
        return;
      }
      if (!selectedSymbol?.trim()) {
        toast.error('Select a symbol');
        return;
      }
      const lots = parseFloat(lotSize);
      if (!Number.isFinite(lots) || lots <= 0) {
        toast.error('Invalid lot size');
        return;
      }
      // MT5-style: instant sound + optimistic position, no button disable
      sounds.orderPlaced();
      toast.success(`${side.toUpperCase()} ${lotSize} ${selectedSymbol}`, { duration: 1500 });
      placeOrder({
        account_id: activeAccount.id,
        symbol: selectedSymbol,
        side,
        order_type: 'market',
        lots,
      })
        .then(() => {
          // After a trade is placed on mobile, jump straight to the
          // "Trades" view so the trader immediately sees the new (and all
          // other) open positions — the panel there is scrollable.
          if (accountId) {
            router.push(tradingTerminalUrl(accountId, { view: 'order' }));
          }
        })
        .catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Order failed');
        });
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 pb-[calc(64px+env(safe-area-inset-bottom,0px))] scrollbar-none bg-bg-base">
        {/* Top app navbar — provides the hamburger (three-bar) icon that
            opens the navigation sidebar drawer (close via the same toggle
            or the backdrop). Mobile terminal otherwise has no app nav. */}
        <AppNavbar />
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col scrollbar-none">
          {mobileView === 'watchlist' && <Watchlist />}
          {mobileView === 'news' && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-bg-primary">
              <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-glass bg-bg-secondary">
                <button
                  type="button"
                  onClick={() => router.push(tradingTerminalUrl(accountId, { view: 'chart' }))}
                  className="text-xs font-semibold text-buy"
                >
                  ← Chart
                </button>
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Live news</span>
                <span className="w-14" aria-hidden />
              </div>
              <div className="flex-1 min-h-0">
                <TradingViewNewsTimeline />
              </div>
            </div>
          )}
          {mobileView === 'chart' && (
            <div className="h-full flex flex-col min-h-0">
              {/* Dynamic Chart Tabs Header */}
              {!chartExpanded ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-secondary border-b border-border-glass overflow-x-auto no-scrollbar scrollbar-none">
                {chartTabs.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={clsx(
                      'px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all border whitespace-nowrap flex items-center gap-2 group',
                      symbol === selectedSymbol
                        ? 'bg-bg-primary text-text-primary border-border-glass shadow-sm'
                        : 'bg-transparent text-text-tertiary border-transparent hover:text-text-primary'
                    )}
                  >
                    {symbol}
                    <div
                      onClick={(e) => removeTab(e, symbol)}
                      className="p-0.5 rounded-md hover:bg-sell/10 hover:text-sell transition-colors opacity-60 group-hover:opacity-100"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => { setMobileSymbolSearch(true); setMobileSearchQuery(''); setTimeout(() => mobileSearchRef.current?.focus(), 100); }}
                  className="shrink-0 w-10 h-[34px] flex items-center justify-center rounded-xl bg-bg-hover/80 text-text-primary border border-border-glass hover:bg-buy/10 transition-all active:scale-95"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(tradingTerminalUrl(accountId, { view: 'news' }))}
                  className="shrink-0 px-3 h-[34px] rounded-xl bg-bg-hover/80 text-text-primary border border-border-glass text-[10px] font-extrabold uppercase tracking-wide hover:bg-buy/10 transition-all active:scale-95"
                >
                  News
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTicketOpen(true)}
                  className="shrink-0 px-3 h-[34px] rounded-xl bg-bg-hover/80 text-text-primary border border-border-glass text-[10px] font-extrabold uppercase tracking-wide hover:bg-accent/10 transition-all active:scale-95"
                  title="Order ticket — stop loss, take profit, pending orders"
                >
                  Order
                </button>
                <button
                  type="button"
                  onClick={() => router.push(tradingTerminalUrl(accountId, { view: 'order' }))}
                  className="shrink-0 px-3 h-[34px] rounded-xl bg-bg-hover/80 text-text-primary border border-border-glass text-[10px] font-extrabold uppercase tracking-wide hover:bg-accent/10 transition-all active:scale-95"
                  title="Open positions, pending orders, history"
                >
                  Trades
                </button>
              </div>
              ) : null}

              {/* ── Mobile Symbol Search Overlay ── */}
              {mobileSymbolSearch && (
                <div className="fixed inset-0 z-[90] flex flex-col bg-bg-base">
                  {/* Search header */}
                  <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-border-glass bg-bg-secondary">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        ref={mobileSearchRef}
                        type="text"
                        value={mobileSearchQuery}
                        onChange={(e) => setMobileSearchQuery(e.target.value)}
                        placeholder="Search symbol..."
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-border-glass bg-bg-primary text-text-primary placeholder:text-text-tertiary outline-none focus:border-buy/50 focus:ring-1 focus:ring-buy/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileSymbolSearch(false)}
                      className="shrink-0 px-3 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Filtered instrument list */}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                    {(() => {
                      const q = mobileSearchQuery.toLowerCase().trim();
                      const matched = instruments.filter((inst: InstrumentInfo) =>
                        q === '' ? true : inst.symbol.toLowerCase().includes(q) || (inst.segment || '').toLowerCase().includes(q)
                      );
                      if (matched.length === 0 && q !== '') {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Search className="w-10 h-10 text-text-tertiary/40" />
                            <p className="text-sm text-text-tertiary">No symbols match &ldquo;{mobileSearchQuery}&rdquo;</p>
                          </div>
                        );
                      }
                      return matched.map((inst: InstrumentInfo) => {
                        const tick = prices[inst.symbol];
                        const isInTabs = chartTabs.includes(inst.symbol);
                        return (
                          <button
                            key={inst.symbol}
                            type="button"
                            onClick={() => {
                              setSelectedSymbol(inst.symbol);
                              setChartTabs(prev => prev.includes(inst.symbol) ? prev : [...prev, inst.symbol]);
                              setMobileSymbolSearch(false);
                            }}
                            className={clsx(
                              'w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors',
                              isInTabs ? 'bg-buy/[0.06]' : 'hover:bg-bg-hover active:bg-buy/5',
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-text-primary font-mono">{inst.symbol}</span>
                                {isInTabs && <span className="text-buy text-[10px] font-bold">OPEN</span>}
                              </div>
                              <p className="text-xs text-text-tertiary mt-0.5 truncate uppercase tracking-wide">
                                {inst.segment || ''}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-3">
                              {tick ? (
                                <span className="text-sm font-mono font-bold tabular-nums text-text-primary">
                                  {tick.bid.toFixed(inst.digits ?? 5)}
                                </span>
                              ) : null}
                              {!isInTabs && (
                                <span className="text-buy text-xs font-semibold">+ Open</span>
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {!chartExpanded && activeAccount ? (
                <div className="sm:hidden shrink-0 px-3 py-1.5 border-b border-border-glass bg-bg-secondary/40">
                  <ActiveAccountBadge account={activeAccount} variant="compact" />
                </div>
              ) : null}

              <div
                className={clsx(
                  'flex flex-col flex-1 min-h-0 overflow-hidden bg-bg-primary',
                  chartExpanded &&
                    'fixed inset-0 z-[100] h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]',
                )}
              >
                {chartExpanded ? (
                  <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-glass bg-bg-secondary">
                    <span className="text-sm font-bold text-text-primary truncate">{selectedSymbol || 'Chart'}</span>
                    <button
                      type="button"
                      onClick={() => setChartExpanded(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary border border-border-glass hover:bg-bg-hover hover:text-text-primary"
                    >
                      <Minimize2 className="w-4 h-4 shrink-0" aria-hidden />
                      Close
                    </button>
                  </div>
                ) : null}
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
                  <ChartErrorBoundary>
                    <TradingViewChart theme={chartTheme} />
                  </ChartErrorBoundary>
                </div>
              </div>

              {/* Refined Quick Trade Bottom Bar */}
              <div className="fixed bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-bg-secondary/95 backdrop-blur-xl border-t border-border-glass z-50">
                {!mobileMarketStatus.isOpen && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sell/10 border border-sell/20">
                    <span className="text-[9px] font-bold text-sell uppercase tracking-wider">● CLOSED</span>
                    <span className="text-[10px] text-sell/80 truncate">{mobileMarketStatus.reason}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 h-[52px]">
                   {/* SELL button */}
                   <button
                     type="button"
                     disabled={!mobileMarketStatus.isOpen}
                     onClick={() => placeMarketOrder('sell')}
                     className="flex-1 h-full bg-sell rounded-xl flex flex-col items-center justify-center shadow-lg shadow-sell/20 active:scale-[0.96] transition-transform duration-75 disabled:opacity-50 disabled:pointer-events-none min-w-0"
                   >
                     <span className="text-white text-[14px] font-black uppercase tracking-[0.05em]">Sell</span>
                     <span className="text-white/70 text-[10px] font-mono font-bold leading-tight">{price?.bid.toFixed(digits) || '--'}</span>
                   </button>

                   {/* Lot size controls — center */}
                   <div className="shrink-0 flex flex-col items-center">
                      <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider leading-none mb-1">Lots</span>
                      <div className="flex items-center gap-1">
                         <button
                           onClick={() => handleLotChange(-0.01)}
                           className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-primary border border-border-glass text-text-primary active:scale-90 transition-transform"
                         >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/></svg>
                         </button>
                         <input
                           type="text"
                           inputMode="decimal"
                           value={lotSize}
                           onChange={(e) => {
                             const v = e.target.value;
                             if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setLotSize(v);
                           }}
                           onBlur={() => {
                             const n = parseFloat(lotSize);
                             if (!Number.isFinite(n) || n <= 0) setLotSize('0.01');
                             else setLotSize(n.toFixed(2));
                           }}
                           className="w-16 h-9 text-[15px] font-black font-mono text-center bg-bg-primary border-2 border-border-glass rounded-lg text-text-primary outline-none"
                         />
                         <button
                           onClick={() => handleLotChange(0.01)}
                           className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-primary border border-border-glass text-text-primary active:scale-90 transition-transform"
                         >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                         </button>
                      </div>
                   </div>

                   {/* BUY button */}
                   <button
                     type="button"
                     disabled={!mobileMarketStatus.isOpen}
                     onClick={() => placeMarketOrder('buy')}
                     className="flex-1 h-full bg-buy rounded-xl flex flex-col items-center justify-center shadow-lg shadow-buy/20 active:scale-[0.96] transition-transform duration-75 disabled:opacity-50 disabled:pointer-events-none min-w-0"
                   >
                     <span className="text-white text-[14px] font-black uppercase tracking-[0.05em]">Buy</span>
                     <span className="text-white/70 text-[10px] font-mono font-bold leading-tight">{price?.ask.toFixed(digits) || '--'}</span>
                   </button>
                </div>
              </div>
            </div>
          )}
          {/* Order ticket, as a bottom sheet rather than another `view`: it is
              opened to do one thing and dismissed, and routing to it would put
              it in the back-stack so the phone's Back button leaves the
              terminal instead of closing the ticket. Capped at 85vh with the
              panel scrolling inside, so a long ticket (pending + SL + TP) can
              still be reached on a short screen. */}
          {mobileTicketOpen && (
            // z-[120], matching the desktop order window. The mobile chart's
            // own expand mode and the bottom Sell/Buy bar sit at z-[100], so a
            // sheet below that came up underneath them.
            <div className="fixed inset-0 z-[120] flex flex-col justify-end">
              <button
                type="button"
                aria-label="Close order ticket"
                onClick={() => setMobileTicketOpen(false)}
                className="absolute inset-0 bg-black/60"
              />
              <div className="relative max-h-[85vh] flex flex-col rounded-t-2xl border-t border-border-glass bg-bg-primary pb-[env(safe-area-inset-bottom,0px)]">
                <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-glass">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Order
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileTicketOpen(false)}
                    className="text-xs font-semibold text-text-tertiary px-2 py-1"
                  >
                    Close
                  </button>
                </div>
                {/* min-h-0 WITHOUT flex-1 — the same shape DraggableOrderModal
                    uses. In an auto-height flex column, flex-1 means
                    flex-basis:0, and with min-height:0 allowing the collapse
                    the item resolves to zero height: the sheet rendered as a
                    bare header strip with the whole ticket squashed out of
                    existence. Letting it size to its content and capping the
                    parent at 85vh gives the panel its height and still scrolls
                    when SL, TP and Pending are all open. */}
                <div className="min-h-0 overflow-y-auto">
                  {/* Same auto-dismiss as the desktop window: the sheet covers
                      the chart, so leaving it up after a fill hides the thing
                      the trader placed the order to watch. */}
                  <OrderPanel onPlaced={() => setMobileTicketOpen(false)} />
                </div>
              </div>
            </div>
          )}
          {mobileView === 'order' && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-bg-primary">
              <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border-glass bg-bg-secondary">
                <button
                  type="button"
                  onClick={() => router.push(tradingTerminalUrl(accountId, { view: 'chart' }))}
                  className="text-xs font-semibold text-buy"
                >
                  ← Chart
                </button>
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Trades</span>
                <span className="w-14" aria-hidden />
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <PositionsPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Desktop: the MetaTrader 5 shell.
   *
   * Everything below the mobile branch used to be the desktop layout inline —
   * chart, a togglable right-hand Markets/News/Calc drawer, an icon rail and a
   * positions strip. It now lives in components/trading/mt5/Mt5Terminal, which
   * lays the same data out as MetaTrader: Market Watch docked left, the chart
   * centre under an MT5 toolbar, and the Toolbox tabbed along the bottom.
   *
   * Keeping it in its own component rather than inline is what makes the two
   * layouts independently readable: the phone terminal and the desktop
   * terminal share a data layer and almost no chrome, and interleaving them in
   * one 900-line file is how the desktop drawer state ended up entangled with
   * the mobile `view` query param. */
  return <Mt5Terminal />;
}
