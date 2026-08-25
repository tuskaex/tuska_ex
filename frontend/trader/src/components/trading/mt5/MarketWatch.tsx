'use client';

/**
 * Market Watch — MetaTrader's left dock.
 *
 * This is the panel that makes a terminal read as MT5 more than any other: a
 * dense quote list pinned to the left edge, Bid in red and Ask in blue, the
 * changed cell flashing for a beat, and four tabs along the bottom (Symbols,
 * Details, Trading, Ticks).
 *
 * It replaces the old right-hand Markets drawer. The drawer was a toggle — the
 * chart was full-width until you opened it — which is the opposite of how a
 * trader uses a quote list: it is the thing that is always visible, and the
 * chart is what you change. Docking it left and giving it a splitter matches
 * that, and is also what MetaTrader does.
 *
 * The rows are deliberately NOT virtualised. The instrument list is on the
 * order of 100 symbols and the whole point of the panel is that every row
 * repaints on its own tick; a windowing library would add a scroll listener
 * and a measurement pass to save nothing at this size.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Plus, Search, X } from 'lucide-react';
import { useTradingStore, type InstrumentInfo, type TickData } from '@/stores/tradingStore';

export type MarketWatchTab = 'symbols' | 'details' | 'trading' | 'ticks';

interface MarketWatchProps {
  /** Pops the order dialog for a symbol — MT5's double-click / F9. */
  onNewOrder: (symbol: string) => void;
  /** Hides the dock. The chart takes the space; the toolbar toggles it back. */
  onClose: () => void;
}

/** MT5 prints a quote to the instrument's own precision, not a fixed 5. */
function fmt(v: number | undefined | null, digits: number): string {
  return Number.isFinite(v as number) ? (v as number).toFixed(digits) : '—';
}

/**
 * One quote row.
 *
 * Split out and memoised because it is the hot path: a busy feed pushes
 * several ticks a second and only the rows whose symbol moved should do any
 * work. The parent passes the tick object, which is a fresh reference per
 * update, so memo compares exactly what matters.
 */
const QuoteRow = memo(function QuoteRow({
  inst,
  tick,
  selected,
  onSelect,
  onNewOrder,
}: {
  inst: InstrumentInfo;
  tick: TickData | undefined;
  selected: boolean;
  onSelect: (s: string) => void;
  onNewOrder: (s: string) => void;
}) {
  const digits = inst.digits ?? 5;
  const bid = tick?.bid;
  const ask = tick?.ask;

  /* Direction of the last change, held in a ref so computing it cannot itself
   * schedule a render. `dir` is state only because the flash class has to
   * appear in the DOM; it is reset to null by the animation ending, which is
   * cheaper than a timer per row. */
  const prevBidRef = useRef<number | undefined>(undefined);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevBidRef.current;
    if (bid != null && prev != null && bid !== prev) {
      setDir(bid > prev ? 'up' : 'down');
    }
    if (bid != null) prevBidRef.current = bid;
  }, [bid]);

  /* MetaTrader colours Bid and Ask TOGETHER, by the direction the quote last
   * moved: blue when it ticked up, red when it ticked down. It does not paint
   * bid-is-always-red / ask-is-always-blue — that would carry no information,
   * since which of the two is higher never changes. A symbol that has not
   * moved since the panel opened stays plain, so a still row is visibly still
   * rather than arbitrarily coloured. */
  const quoteClass = dir === 'up' ? 'mt5-ask' : dir === 'down' ? 'mt5-bid' : '';

  /* Re-triggering a CSS animation needs the class removed and re-added. Keying
   * the cell on the price does that for free: a new key is a new element, so
   * the animation restarts on every tick without an explicit reflow poke. */
  const flashKey = `${bid ?? ''}-${ask ?? ''}`;

  /* MT5 marks a symbol whose feed has gone quiet rather than hiding it — a
   * trader needs to know the price on screen is not live before acting on it.
   * The backend already flags this on the tick (stale-refresher republish). */
  const stale = Boolean(tick?.stale);

  return (
    /* Row-level click, as in every MetaTrader list — but a row is not a
       control, so keyboard users get an explicit path: arrow to the row, Enter
       to select it, and the same double-click behaviour on Enter twice is
       replaced by the New Order button in the Trading tab. Without tabIndex
       and the key handler this panel would be mouse-only. */
    <tr
      className={clsx('mt5-row', selected && 'is-selected')}
      onClick={() => onSelect(inst.symbol)}
      onDoubleClick={() => onNewOrder(inst.symbol)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(inst.symbol);
        }
      }}
      tabIndex={0}
      aria-selected={selected}
      aria-label={`${inst.symbol}${stale ? ', quote is not live' : ''}`}
      /* Spread lost its own column when Last took the slot, matching the
         reference layout — but it is the number a broker's client checks most
         often, so it moves into the row's tooltip rather than disappearing. */
      title={[
        inst.display_name,
        bid != null && ask != null
          ? `spread ${Math.max(0, Math.round(((ask - bid) / (inst.pip_size || 0.0001)) * 10) / 10)} pts`
          : null,
        stale ? 'quote is not live' : null,
      ]
        .filter(Boolean)
        .join(' — ')}
    >
      <td className="px-1.5 truncate">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={clsx(
              'mt5-arrow',
              dir === 'up' ? 'mt5-arrow--up' : dir === 'down' ? 'mt5-arrow--down' : 'mt5-arrow--flat',
            )}
            aria-hidden
          />
          <span className={clsx('font-semibold', stale && 'text-text-tertiary')}>{inst.symbol}</span>
        </span>
      </td>
      <td key={`b${flashKey}`} className={clsx('mt5-num px-1.5', quoteClass, dir && `mt5-flash-${dir}`)}>
        {fmt(bid, digits)}
      </td>
      <td key={`a${flashKey}`} className={clsx('mt5-num px-1.5', quoteClass, dir && `mt5-flash-${dir}`)}>
        {fmt(ask, digits)}
      </td>
      {/* MetaTrader's Last column is the last DEAL price. There is no deal
          tape on this feed — the gateway publishes bid/ask only — and for the
          FX and metals that dominate this list MetaTrader's own Last tracks
          the bid anyway, which is why the two columns read identically in a
          real Market Watch. Printing the bid is therefore the honest value,
          not a placeholder; it is left uncoloured so the eye reads direction
          from the two quote columns rather than three. */}
      <td className="mt5-num px-1.5">{fmt(bid, digits)}</td>
    </tr>
  );
});

/** MT5's Details tab: the contract specification for the selected symbol. */
function DetailsTab({ inst, tick }: { inst?: InstrumentInfo; tick?: TickData }) {
  if (!inst) {
    return <p className="p-3 text-text-tertiary">Select a symbol to see its specification.</p>;
  }
  const digits = inst.digits ?? 5;
  const rows: [string, string][] = [
    ['Symbol', inst.symbol],
    ['Description', inst.display_name || inst.symbol],
    ['Type', inst.segment || '—'],
    ['Digits', String(digits)],
    ['Contract size', String(inst.contract_size ?? '—')],
    ['Point size', String(inst.pip_size ?? '—')],
    ['Volume min', String(inst.min_lot ?? '—')],
    ['Volume max', String(inst.max_lot ?? '—')],
    ['Volume step', String(inst.lot_step ?? '—')],
    ['Base currency', inst.base_currency || '—'],
    ['Profit currency', inst.quote_currency || '—'],
    ['Bid', fmt(tick?.bid, digits)],
    ['Ask', fmt(tick?.ask, digits)],
  ];
  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="mt5-row">
              <td className="px-1.5 text-text-secondary w-1/2">{k}</td>
              <td className="px-1.5 font-semibold truncate">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * MT5's Trading tab: a one-click Sell/Ask pair for the selected symbol.
 *
 * Placement goes through the shared order dialog rather than firing straight
 * at the API. MT5's own one-click trading is a setting a trader has to arm
 * precisely because a mis-click sends a live order, and this app already has
 * that setting (uiStore.oneClickTrading) wired into the order ticket — routing
 * through the ticket means one place decides whether a click is armed.
 */
function TradingTab({
  inst,
  tick,
  onNewOrder,
}: {
  inst?: InstrumentInfo;
  tick?: TickData;
  onNewOrder: (s: string) => void;
}) {
  if (!inst) {
    return <p className="p-3 text-text-tertiary">Select a symbol to trade it.</p>;
  }
  const digits = inst.digits ?? 5;
  return (
    <div className="p-2 flex flex-col gap-2">
      <div className="text-center font-semibold">{inst.symbol}</div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onNewOrder(inst.symbol)}
          className="flex flex-col items-center justify-center h-11 border border-[color:var(--mt5-bid)] text-[color:var(--mt5-bid)] hover:bg-sell/10"
        >
          <span className="text-[10px] uppercase tracking-wide">Sell</span>
          <span className="mt5-num font-bold text-[13px]">{fmt(tick?.bid, digits)}</span>
        </button>
        <button
          type="button"
          onClick={() => onNewOrder(inst.symbol)}
          className="flex flex-col items-center justify-center h-11 border border-[color:var(--mt5-ask)] text-[color:var(--mt5-ask)] hover:bg-buy/10"
        >
          <span className="text-[10px] uppercase tracking-wide">Buy</span>
          <span className="mt5-num font-bold text-[13px]">{fmt(tick?.ask, digits)}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => onNewOrder(inst.symbol)}
        className="mt5-tbtn w-full !h-6 border-[color:var(--border-primary)]"
      >
        New order…
      </button>
    </div>
  );
}

/**
 * MT5's Ticks tab: bid and ask plotted against arrival order, not time.
 *
 * Drawn from a rolling buffer this component fills itself. The store keeps
 * only the latest tick per symbol — history would mean retaining every quote
 * for every instrument, which is a memory leak for a panel most traders never
 * open. Buffering here means the cost is paid only while the tab is on screen,
 * and the trade-off is honest: the chart starts empty when you open it.
 */
function TicksTab({ symbol, tick, digits }: { symbol: string; tick?: TickData; digits: number }) {
  const bufRef = useRef<{ bid: number; ask: number }[]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    bufRef.current = [];
    force((n) => n + 1);
  }, [symbol]);

  useEffect(() => {
    if (tick?.bid == null || tick?.ask == null) return;
    const buf = bufRef.current;
    const last = buf[buf.length - 1];
    if (last && last.bid === tick.bid && last.ask === tick.ask) return;
    buf.push({ bid: tick.bid, ask: tick.ask });
    if (buf.length > 240) buf.shift();
    force((n) => n + 1);
  }, [tick?.bid, tick?.ask]);

  const buf = bufRef.current;
  if (buf.length < 2) {
    return <p className="p-3 text-text-tertiary">Collecting ticks for {symbol}…</p>;
  }

  const lo = Math.min(...buf.map((p) => p.bid));
  const hi = Math.max(...buf.map((p) => p.ask));
  const range = hi - lo || 1;
  const path = (key: 'bid' | 'ask') =>
    buf
      .map((p, i) => {
        const x = (i / (buf.length - 1)) * 100;
        const y = 100 - ((p[key] - lo) / range) * 100;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-1.5 py-1 border-b border-border-secondary">
        <span className="font-semibold">{symbol}</span>
        <span className="mt5-num">
          <span className="mt5-bid">{fmt(tick?.bid, digits)}</span>
          {' / '}
          <span className="mt5-ask">{fmt(tick?.ask, digits)}</span>
        </span>
      </div>
      <div className="flex-1 min-h-0 p-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path d={path('bid')} fill="none" stroke="var(--mt5-bid)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <path d={path('ask')} fill="none" stroke="var(--mt5-ask)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="px-1.5 py-0.5 border-t border-border-secondary text-text-tertiary">
        {buf.length} ticks · {fmt(lo, digits)} – {fmt(hi, digits)}
      </div>
    </div>
  );
}

export default function MarketWatch({ onNewOrder, onClose }: MarketWatchProps) {
  const instruments = useTradingStore((s) => s.instruments);
  const prices = useTradingStore((s) => s.prices);
  const selectedSymbol = useTradingStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useTradingStore((s) => s.setSelectedSymbol);
  const watchlist = useTradingStore((s) => s.watchlist);
  const addToWatchlist = useTradingStore((s) => s.addToWatchlist);

  const [tab, setTab] = useState<MarketWatchTab>('symbols');
  const [query, setQuery] = useState('');
  /* MT5 opens with a short curated list and "Show all" reveals the rest. The
   * default here is the user's watchlist for the same reason: 100+ rows of
   * instruments they do not trade is not a market watch. */
  const [showAll, setShowAll] = useState(false);
  const [clock, setClock] = useState('');

  /* The caption clock. MetaTrader shows the SERVER time there, and this
   * platform runs its sessions in UTC (see lib/marketHours), so the terminal
   * clock is UTC too — a local-time clock in the caption would disagree with
   * the market-hours banner two panels away. */
  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = showAll || q !== ''
      ? instruments
      : instruments.filter((i) => watchlist.includes(i.symbol));
    const list = q === ''
      ? base
      : base.filter(
          (i) =>
            i.symbol.toLowerCase().includes(q) ||
            (i.display_name || '').toLowerCase().includes(q) ||
            (i.segment || '').toLowerCase().includes(q),
        );
    /* Grouped by segment then alphabetical, which is how MetaTrader orders
     * Market Watch once you stop dragging rows around by hand. */
    return [...list].sort(
      (a, b) => (a.segment || '').localeCompare(b.segment || '') || a.symbol.localeCompare(b.symbol),
    );
  }, [instruments, watchlist, query, showAll]);

  const selectedInst = useMemo(
    () => instruments.find((i) => i.symbol === selectedSymbol),
    [instruments, selectedSymbol],
  );
  const selectedTick = prices[selectedSymbol];

  const tabs: { id: MarketWatchTab; label: string }[] = [
    { id: 'symbols', label: 'Symbols' },
    { id: 'details', label: 'Details' },
    { id: 'trading', label: 'Trading' },
    { id: 'ticks', label: 'Ticks' },
  ];

  return (
    <div className="mt5-dock h-full min-h-0 flex flex-col bg-bg-primary border-r border-border-primary">
      <div className="mt5-caption">
        <span className="flex-1 truncate">Market Watch: {clock}</span>
        <button
          type="button"
          onClick={onClose}
          title="Hide Market Watch"
          aria-label="Hide Market Watch"
          className="mt5-tbtn !min-w-0 !h-4 !px-1"
        >
          <X className="w-3 h-3" aria-hidden />
        </button>
      </div>

      {tab === 'symbols' && (
        <>
          <div className="flex items-center gap-1 px-1 py-1 border-b border-border-secondary">
            <div className="relative flex-1 min-w-0">
              <Search
                className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none"
                aria-hidden
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Symbol"
                aria-label="Filter symbols"
                className="w-full !pl-5"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-pressed={showAll}
              className="mt5-tbtn"
              title={showAll ? 'Show only my watchlist' : 'Show all symbols'}
            >
              {showAll ? 'Mine' : 'All'}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <th className="text-left px-1.5 w-[31%]">Symbol</th>
                  <th className="!text-right px-1.5 w-[23%]">Bid</th>
                  <th className="!text-right px-1.5 w-[23%]">Ask</th>
                  <th className="!text-right px-1.5 w-[23%]">Last</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inst) => (
                  <QuoteRow
                    key={inst.symbol}
                    inst={inst}
                    tick={prices[inst.symbol]}
                    selected={inst.symbol === selectedSymbol}
                    onSelect={setSelectedSymbol}
                    onNewOrder={onNewOrder}
                  />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-center text-text-tertiary">
                      {query ? `No symbol matches "${query}"` : 'No symbols'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Adding the highlighted symbol to the watchlist, so a trader who
              found it through "All" can keep it without leaving the panel.
              Hidden while already in the list — MT5 greys the menu item. */}
          {selectedInst && !watchlist.includes(selectedInst.symbol) && (
            <button
              type="button"
              onClick={() => addToWatchlist(selectedInst.symbol)}
              className="mt5-tbtn !h-5 !justify-start border-t border-border-secondary"
            >
              <Plus className="w-3 h-3" aria-hidden />
              Add {selectedInst.symbol} to Market Watch
            </button>
          )}
        </>
      )}

      {tab === 'details' && (
        <div className="flex-1 min-h-0">
          <DetailsTab inst={selectedInst} tick={selectedTick} />
        </div>
      )}
      {tab === 'trading' && (
        <div className="flex-1 min-h-0 overflow-auto">
          <TradingTab inst={selectedInst} tick={selectedTick} onNewOrder={onNewOrder} />
        </div>
      )}
      {tab === 'ticks' && (
        <div className="flex-1 min-h-0">
          <TicksTab
            symbol={selectedSymbol}
            tick={selectedTick}
            digits={selectedInst?.digits ?? 5}
          />
        </div>
      )}

      <div className="mt5-tabs" role="tablist" aria-label="Market Watch views">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="mt5-tab"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
