'use client';

/**
 * Toolbox — MetaTrader's bottom dock.
 *
 * MT5 puts everything that is not the chart down here behind tabs: Trade,
 * History, News, Journal. The Trade tab is the one that matters — open
 * positions, then a single summary line (Balance / Equity / Margin / Free
 * margin / Level), then pending orders underneath. That summary line inside
 * the blotter, rather than floating above it in cards, is the detail that most
 * makes a screen read as MetaTrader.
 *
 * ── Why this is a new table and not the existing PositionsPanel ────────────
 * PositionsPanel stays: it is what /portfolio and the mobile terminal render,
 * it is touch-sized, and it carries bulk-close, partial close, CSV export and
 * share-trade. Reskinning it to 16px rows would have made it worse everywhere
 * else it is used.
 *
 * What this file duplicates is only the two API calls (close, modify) — both
 * one-liners against endpoints the panel already documents. What it does NOT
 * duplicate is the blotter's logic: optimistic-row reconciliation, bulk close
 * and history pagination all stay in PositionsPanel. If a third caller ever
 * needs close-and-toast, that is the moment to extract it; at two it would be
 * indirection for its own sake.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { RefreshCw, Trash2, X } from 'lucide-react';
import api from '@/lib/api/client';
import { sounds } from '@/lib/sounds';
import journal, { type JournalEntry } from '@/lib/terminalJournal';
import { useTradingStore, type PendingOrder, type Position } from '@/stores/tradingStore';
import TradingViewNewsTimeline from '@/components/charts/TradingViewNewsTimeline';

export type ToolboxTab = 'trade' | 'history' | 'news' | 'journal';

interface ClosedTrade {
  id: string;
  symbol: string;
  side: string;
  lots: number;
  open_price: number;
  close_price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  pnl: number;
  commission: number;
  swap: number;
  close_time: string;
  close_reason?: string;
}

/** MetaTrader writes 1 234.56 — a space thousands separator, always 2 dp. */
function money(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');
}

/** MT5 timestamps are `YYYY.MM.DD HH:MM:SS`, in server (UTC) time. */
function mtTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '.');
}

function pnlClass(v: number): string {
  /* MetaTrader colours profit blue and loss red — it does not use green.
   * Reusing the buy/sell tokens keeps a profitable buy and its quote the
   * same hue, which is the association a trader already has from the chart. */
  return v > 0 ? 'text-buy' : v < 0 ? 'text-sell' : 'text-text-secondary';
}

/** SL/TP editor. MT5 opens this on double-click of a position row. */
function ModifyDialog({
  title,
  initialSl,
  initialTp,
  digits,
  saving,
  canClear,
  onCancel,
  onSave,
}: {
  title: string;
  initialSl: string;
  initialTp: string;
  digits: number;
  saving: boolean;
  /**
   * Whether emptying a box removes the level.
   *
   * True for positions: `modify_position` reads `model_fields_set`, so an
   * explicit null is JSON-Merge-Patch "clear this". False for pending orders:
   * `modify_order` still applies each field with `if req.stop_loss is not
   * None`, so a null there is indistinguishable from "not sent" and the old
   * level survives. Saying which one applies beats a trader clearing a box,
   * saving, and watching the level come straight back.
   */
  canClear: boolean;
  onCancel: () => void;
  onSave: (sl: string, tp: string) => void;
}) {
  const [sl, setSl] = useState(initialSl);
  const [tp, setTp] = useState(initialTp);
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40">
      <div className="mt5-panel w-[300px]">
        <div className="mt5-caption">
          <span className="flex-1 truncate">{title}</span>
          <button type="button" onClick={onCancel} aria-label="Close" className="mt5-tbtn !min-w-0 !h-4 !px-1">
            <X className="w-3 h-3" aria-hidden />
          </button>
        </div>
        <div className="p-2 flex flex-col gap-2">
          <label htmlFor="mt5-modify-sl" className="flex items-center gap-2">
            <span className="w-20 text-text-secondary">Stop Loss</span>
            <input
              id="mt5-modify-sl"
              type="text"
              inputMode="decimal"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder={`0.${'0'.repeat(Math.max(0, digits - 1))}0`}
              className="flex-1 mt5-num"
            />
          </label>
          <label htmlFor="mt5-modify-tp" className="flex items-center gap-2">
            <span className="w-20 text-text-secondary">Take Profit</span>
            <input
              id="mt5-modify-tp"
              type="text"
              inputMode="decimal"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder={`0.${'0'.repeat(Math.max(0, digits - 1))}0`}
              className="flex-1 mt5-num"
            />
          </label>
          <p className="text-text-tertiary leading-snug">
            {canClear
              ? 'Empty a box to remove that level.'
              : 'Leave a box empty to keep its current level — a pending order’s level can be moved here, not removed.'}
          </p>
          <div className="flex justify-end gap-1 pt-1">
            <button type="button" onClick={onCancel} className="mt5-tbtn border-[color:var(--border-primary)]">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave(sl, tp)}
              className="mt5-tbtn border-[color:var(--border-primary)] is-active"
            >
              {saving ? 'Saving…' : 'Modify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Trade tab ──────────────────────────────────────────────────────────── */

function TradeTab() {
  const positions = useTradingStore((s) => s.positions);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const activeAccount = useTradingStore((s) => s.activeAccount);
  const instruments = useTradingStore((s) => s.instruments);
  const prices = useTradingStore((s) => s.prices);
  const removePosition = useTradingStore((s) => s.removePosition);
  const refreshPositions = useTradingStore((s) => s.refreshPositions);
  const refreshPendingOrders = useTradingStore((s) => s.refreshPendingOrders);
  const refreshAccount = useTradingStore((s) => s.refreshAccount);
  const setSelectedSymbol = useTradingStore((s) => s.setSelectedSymbol);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modify, setModify] = useState<
    { kind: 'position' | 'order'; id: string; label: string; sl: string; tp: string; digits: number } | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const digitsOf = useCallback(
    (symbol: string) => instruments.find((i) => i.symbol === symbol)?.digits ?? 5,
    [instruments],
  );

  const floating = useMemo(
    () => positions.reduce((sum, p) => sum + (p.profit || 0) + (p.swap || 0) + (p.commission || 0), 0),
    [positions],
  );

  /* Equity is derived here rather than read off the account row because the
   * account is refreshed on an interval while positions revalue on every
   * tick — showing the server's equity next to live P&L makes the two
   * disagree on screen for up to a poll interval. Same formula the blotter
   * uses (balance + credit + floating). */
  const balance = activeAccount?.balance ?? 0;
  const credit = activeAccount?.credit ?? 0;
  const margin = activeAccount?.margin_used ?? 0;
  const equity = balance + credit + floating;
  const freeMargin = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : null;
  const currency = activeAccount?.currency ?? 'USD';

  const closePosition = (p: Position) => {
    setBusyId(p.id);
    /* Optimistic, matching the blotter: the row goes immediately and a failed
     * close is repaired by the refresh in the catch. A spinner-on-the-row
     * instead would leave a position that is already gone on the server
     * sitting in the list until the next poll. */
    removePosition(p.id);
    journal.log('Trade', `close #${p.id.slice(0, 8)} ${p.symbol} ${p.lots} lots`);
    void (async () => {
      try {
        const res = await api.post<{ profit?: number; close_price?: number }>(
          `/positions/${p.id}/close`,
          {},
          { timeoutMs: 8_000 },
        );
        const pnl = res.profit ?? 0;
        if (pnl >= 0) sounds.profit();
        else sounds.loss();
        toast.success(`Closed @ ${res.close_price} · ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
        journal.log(
          'Trade',
          `#${p.id.slice(0, 8)} ${p.symbol} closed at ${res.close_price}, profit ${pnl.toFixed(2)}`,
          pnl >= 0 ? 'success' : 'error',
        );
        void Promise.all([refreshPositions(), refreshAccount()]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Close failed';
        toast.error(msg);
        journal.log('Trade', `close #${p.id.slice(0, 8)} failed: ${msg}`, 'error');
        void refreshPositions();
      } finally {
        setBusyId(null);
      }
    })();
  };

  const cancelOrder = async (o: PendingOrder) => {
    setBusyId(o.id);
    try {
      await api.delete(`/orders/${o.id}`);
      toast.success('Order cancelled');
      journal.log('Trade', `#${o.id.slice(0, 8)} ${o.symbol} ${o.order_type} cancelled`);
      await refreshPendingOrders();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancel failed';
      toast.error(msg);
      journal.log('Trade', `cancel #${o.id.slice(0, 8)} failed: ${msg}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Clear one bracket level on a position — the ✕ MetaTrader puts inside the
   * S/L and T/P cells.
   *
   * Sends an explicit null for that field only. `modify_position` keys off
   * `model_fields_set`, so the field NOT sent is untouched and the field sent
   * as null is removed; sending both would wipe the level the trader did not
   * click. Positions only — see ModifyDialog's `canClear`.
   */
  const clearLevel = async (positionId: string, field: 'stop_loss' | 'take_profit') => {
    setBusyId(positionId);
    try {
      await api.put(`/positions/${positionId}`, { [field]: null });
      const what = field === 'stop_loss' ? 'Stop loss' : 'Take profit';
      toast.success(`${what} removed`);
      journal.log('Trade', `#${positionId.slice(0, 8)} ${field} removed`);
      await refreshPositions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not remove the level';
      toast.error(msg);
      journal.log('Trade', `clear ${field} on #${positionId.slice(0, 8)} failed: ${msg}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const saveModify = async (sl: string, tp: string) => {
    if (!modify) return;
    const body: Record<string, unknown> = {};
    if (modify.kind === 'position') {
      /* Both fields always sent, empty meaning null. That is what makes the
       * dialog able to remove a level at all, and it is safe because the
       * dialog opens pre-filled with the CURRENT levels — an untouched box
       * sends back the value it already had. */
      body.stop_loss = sl.trim() === '' ? null : parseFloat(sl);
      body.take_profit = tp.trim() === '' ? null : parseFloat(tp);
    } else {
      /* Pending orders cannot clear, so an empty box must be omitted rather
       * than sent as null — a null would be silently ignored by the handler
       * and read as a successful clear that did nothing. */
      if (sl.trim() !== '') body.stop_loss = parseFloat(sl);
      if (tp.trim() !== '') body.take_profit = parseFloat(tp);
      if (Object.keys(body).length === 0) {
        toast.error('Enter a stop loss or take profit first');
        return;
      }
    }
    setSaving(true);
    try {
      const path = modify.kind === 'position' ? `/positions/${modify.id}` : `/orders/${modify.id}`;
      await api.put(path, body);
      toast.success('SL/TP updated');
      journal.log('Trade', `#${modify.id.slice(0, 8)} ${modify.label} modified`);
      setModify(null);
      if (modify.kind === 'position') await refreshPositions();
      else await refreshPendingOrders();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Modify failed';
      toast.error(msg);
      journal.log('Trade', `modify #${modify.id.slice(0, 8)} failed: ${msg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const th = 'text-left px-1.5 whitespace-nowrap';
  const thNum = 'px-1.5 whitespace-nowrap !text-right';

  return (
    <div className="h-full min-h-0 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-[1]">
          <tr>
            <th className={th}>Symbol</th>
            <th className={th}>Ticket</th>
            <th className={th}>Time</th>
            <th className={th}>Type</th>
            <th className={thNum}>Volume</th>
            <th className={thNum}>Price</th>
            <th className={thNum}>S / L</th>
            <th className={thNum}>T / P</th>
            <th className={thNum}>Current</th>
            <th className={thNum}>Swap</th>
            <th className={thNum}>Profit</th>
            <th className="w-6" aria-label="Close" />
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const d = digitsOf(p.symbol);
            const tick = prices[p.symbol];
            const cur = p.side === 'buy' ? tick?.bid : tick?.ask;
            const net = (p.profit || 0) + (p.swap || 0) + (p.commission || 0);
            return (
              <tr
                key={p.id}
                className={clsx('mt5-row', selectedId === p.id && 'is-selected')}
                onClick={() => {
                  setSelectedId(p.id);
                  setSelectedSymbol(p.symbol);
                }}
                onDoubleClick={() =>
                  setModify({
                    kind: 'position',
                    id: p.id,
                    label: `${p.symbol} ${p.side}`,
                    sl: p.stop_loss ? String(p.stop_loss) : '',
                    tp: p.take_profit ? String(p.take_profit) : '',
                    digits: d,
                  })
                }
                title="Double-click to modify Stop Loss / Take Profit"
              >
                <td className="px-1.5 font-semibold">{p.symbol}</td>
                <td className="px-1.5 text-text-secondary">{p.id.slice(0, 8)}</td>
                <td className="px-1.5 text-text-secondary whitespace-nowrap">{mtTime(p.created_at)}</td>
                <td className={clsx('px-1.5 font-semibold', p.side === 'buy' ? 'text-buy' : 'text-sell')}>
                  {p.side}
                </td>
                <td className="mt5-num px-1.5">{p.lots.toFixed(2)}</td>
                <td className="mt5-num px-1.5">{p.open_price.toFixed(d)}</td>
                {/* MetaTrader draws a ✕ inside the S/L and T/P cells to drop
                    that level without opening a dialog. Rendered only when a
                    level exists — a ✕ on an empty cell has nothing to do. */}
                <td className="mt5-num px-1.5 text-text-secondary whitespace-nowrap">
                  {p.stop_loss ? (
                    <>
                      {p.stop_loss.toFixed(d)}
                      <button
                        type="button"
                        className="mt5-x"
                        disabled={busyId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void clearLevel(p.id, 'stop_loss');
                        }}
                        title={`Remove stop loss on ${p.symbol}`}
                        aria-label={`Remove stop loss on ${p.symbol}`}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="mt5-num px-1.5 text-text-secondary whitespace-nowrap">
                  {p.take_profit ? (
                    <>
                      {p.take_profit.toFixed(d)}
                      <button
                        type="button"
                        className="mt5-x"
                        disabled={busyId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void clearLevel(p.id, 'take_profit');
                        }}
                        title={`Remove take profit on ${p.symbol}`}
                        aria-label={`Remove take profit on ${p.symbol}`}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="mt5-num px-1.5">{cur != null ? cur.toFixed(d) : '—'}</td>
                <td className="mt5-num px-1.5 text-text-secondary">{money(p.swap || 0)}</td>
                <td className={clsx('mt5-num px-1.5 font-semibold', pnlClass(net))}>{money(net)}</td>
                <td className="px-0.5">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      closePosition(p);
                    }}
                    title={`Close ${p.symbol}`}
                    aria-label={`Close ${p.symbol}`}
                    className="mt5-tbtn !min-w-0 !h-4 !px-0.5 text-text-tertiary hover:text-sell"
                  >
                    <X className="w-3 h-3" aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}

          {positions.length === 0 && (
            <tr>
              <td colSpan={12} className="px-2 py-2 text-text-tertiary">
                No open positions
              </td>
            </tr>
          )}

          {/* The MT5 summary line. It sits INSIDE the table, spanning every
              column, exactly where MetaTrader puts it — between the positions
              and the pending orders. */}
          <tr className="bg-bg-secondary border-y border-border-primary">
            <td colSpan={12} className="px-1.5 py-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                {/* MetaTrader prefixes the line with a small expander glyph.
                    Decorative here — there is nothing to expand — so it is
                    hidden from assistive tech rather than made a button. */}
                <span className="text-text-tertiary" aria-hidden>
                  ⊕
                </span>
                <Metric label="Balance" value={`${money(balance)} ${currency}`} />
                {credit !== 0 && <Metric label="Credit" value={money(credit)} />}
                <Metric label="Equity" value={money(equity)} />
                <Metric label="Margin" value={money(margin)} />
                <Metric label="Free margin" value={money(freeMargin)} />
                <Metric
                  label="Margin level"
                  value={marginLevel != null ? `${marginLevel.toFixed(2)} %` : '—'}
                  /* MetaTrader turns the level red as it approaches stop-out.
                   * 50% is this platform's STOP_OUT_LEVEL default and 80% its
                   * MARGIN_CALL_LEVEL — see .env.example. */
                  className={
                    marginLevel == null
                      ? undefined
                      : marginLevel < 50
                        ? 'text-sell'
                        : marginLevel < 80
                          ? 'text-warning'
                          : undefined
                  }
                />
                {/* Total floating profit, pushed to the row's right edge so it
                    lands under the Profit column — MetaTrader prints it bare
                    there, with no label, because the column above already
                    names it. */}
                <span
                  className={clsx('ml-auto mt5-num font-semibold', pnlClass(floating))}
                  title="Total floating profit"
                >
                  {money(floating)}
                </span>
              </div>
            </td>
          </tr>

          {pendingOrders.map((o) => {
            const d = digitsOf(o.symbol);
            const tick = prices[o.symbol];
            return (
              <tr
                key={o.id}
                className={clsx('mt5-row', selectedId === o.id && 'is-selected')}
                onClick={() => {
                  setSelectedId(o.id);
                  setSelectedSymbol(o.symbol);
                }}
                onDoubleClick={() =>
                  setModify({
                    kind: 'order',
                    id: o.id,
                    label: `${o.symbol} ${o.order_type}`,
                    sl: o.stop_loss ? String(o.stop_loss) : '',
                    tp: o.take_profit ? String(o.take_profit) : '',
                    digits: d,
                  })
                }
                title="Double-click to modify Stop Loss / Take Profit"
              >
                <td className="px-1.5 font-semibold">{o.symbol}</td>
                <td className="px-1.5 text-text-secondary">{o.id.slice(0, 8)}</td>
                <td className="px-1.5 text-text-secondary whitespace-nowrap">{mtTime(o.created_at)}</td>
                <td className={clsx('px-1.5', o.side === 'buy' ? 'text-buy' : 'text-sell')}>
                  {o.side} {o.order_type.replace('_', ' ')}
                </td>
                <td className="mt5-num px-1.5">{o.lots.toFixed(2)}</td>
                <td className="mt5-num px-1.5">{o.price.toFixed(d)}</td>
                <td className="mt5-num px-1.5 text-text-secondary">
                  {o.stop_loss ? o.stop_loss.toFixed(d) : '—'}
                </td>
                <td className="mt5-num px-1.5 text-text-secondary">
                  {o.take_profit ? o.take_profit.toFixed(d) : '—'}
                </td>
                <td className="mt5-num px-1.5 text-text-tertiary">
                  {tick ? tick.bid.toFixed(d) : '—'}
                </td>
                <td className="mt5-num px-1.5 text-text-tertiary">—</td>
                <td className="mt5-num px-1.5 text-text-tertiary">{o.status}</td>
                <td className="px-0.5">
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void cancelOrder(o);
                    }}
                    title={`Cancel ${o.symbol} ${o.order_type}`}
                    aria-label={`Cancel ${o.symbol} ${o.order_type}`}
                    className="mt5-tbtn !min-w-0 !h-4 !px-0.5 text-text-tertiary hover:text-sell"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modify && (
        <ModifyDialog
          title={`Modify — ${modify.label}`}
          initialSl={modify.sl}
          initialTp={modify.tp}
          digits={modify.digits}
          saving={saving}
          canClear={modify.kind === 'position'}
          onCancel={() => setModify(null)}
          onSave={(sl, tp) => void saveModify(sl, tp)}
        />
      )}
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-text-secondary">{label}:</span>
      <span className={clsx('mt5-num font-semibold', className)}>{value}</span>
    </span>
  );
}

/* ── History tab ────────────────────────────────────────────────────────── */

function HistoryTab() {
  const activeAccount = useTradingStore((s) => s.activeAccount);
  const instruments = useTradingStore((s) => s.instruments);
  const accountId = activeAccount?.id;

  const [rows, setRows] = useState<ClosedTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accountId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items?: ClosedTrade[] } | ClosedTrade[]>('/portfolio/trades', {
        page: '1',
        per_page: '200',
        account_id: accountId,
      });
      setRows((res && typeof res === 'object' && 'items' in res ? res.items : Array.isArray(res) ? res : []) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load history');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* A close that happens while this tab is open should appear without the
   * trader hitting refresh. The layout already broadcasts every close as a
   * window event, so listening beats adding another poll. */
  useEffect(() => {
    const onClosed = () => void load();
    window.addEventListener('trade:closed', onClosed);
    return () => window.removeEventListener('trade:closed', onClosed);
  }, [load]);

  const digitsOf = (symbol: string) => instruments.find((i) => i.symbol === symbol)?.digits ?? 5;

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.profit += r.pnl || 0;
          acc.swap += r.swap || 0;
          acc.commission += r.commission || 0;
          return acc;
        },
        { profit: 0, swap: 0, commission: 0 },
      ),
    [rows],
  );

  const th = 'text-left px-1.5 whitespace-nowrap';
  const thNum = 'px-1.5 whitespace-nowrap !text-right';

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="mt5-toolbar">
        <button type="button" onClick={() => void load()} className="mt5-tbtn" disabled={loading}>
          <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} aria-hidden />
          Refresh
        </button>
        <span className="mt5-sep" />
        <span className="text-text-secondary">
          {rows.length} deal{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-[1]">
            <tr>
              <th className={th}>Symbol</th>
              <th className={th}>Ticket</th>
              <th className={th}>Type</th>
              <th className={thNum}>Volume</th>
              <th className={thNum}>Price</th>
              <th className={thNum}>S / L</th>
              <th className={thNum}>T / P</th>
              <th className={th}>Close time</th>
              <th className={thNum}>Close price</th>
              <th className={th}>Reason</th>
              <th className={thNum}>Swap</th>
              <th className={thNum}>Commission</th>
              <th className={thNum}>Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = digitsOf(r.symbol);
              return (
                <tr key={r.id} className="mt5-row">
                  <td className="px-1.5 font-semibold">{r.symbol}</td>
                  <td className="px-1.5 text-text-secondary">{r.id.slice(0, 8)}</td>
                  <td className={clsx('px-1.5 font-semibold', r.side === 'buy' ? 'text-buy' : 'text-sell')}>
                    {r.side}
                  </td>
                  <td className="mt5-num px-1.5">{Number(r.lots).toFixed(2)}</td>
                  <td className="mt5-num px-1.5">{Number(r.open_price).toFixed(d)}</td>
                  <td className="mt5-num px-1.5 text-text-secondary">
                    {r.stop_loss ? Number(r.stop_loss).toFixed(d) : '—'}
                  </td>
                  <td className="mt5-num px-1.5 text-text-secondary">
                    {r.take_profit ? Number(r.take_profit).toFixed(d) : '—'}
                  </td>
                  <td className="px-1.5 text-text-secondary whitespace-nowrap">{mtTime(r.close_time)}</td>
                  <td className="mt5-num px-1.5">{Number(r.close_price).toFixed(d)}</td>
                  <td className="px-1.5 text-text-secondary uppercase">{r.close_reason || 'manual'}</td>
                  <td className="mt5-num px-1.5 text-text-secondary">{money(r.swap || 0)}</td>
                  <td className="mt5-num px-1.5 text-text-secondary">{money(r.commission || 0)}</td>
                  <td className={clsx('mt5-num px-1.5 font-semibold', pnlClass(r.pnl || 0))}>
                    {money(r.pnl || 0)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} className="px-2 py-2 text-text-tertiary">
                  {loading ? 'Loading history…' : (error ?? 'No closed deals')}
                </td>
              </tr>
            )}
            {rows.length > 0 && (
              <tr className="bg-bg-secondary border-t border-border-primary">
                <td colSpan={10} className="px-1.5 py-1 text-text-secondary">
                  Total
                </td>
                <td className="mt5-num px-1.5 font-semibold">{money(totals.swap)}</td>
                <td className="mt5-num px-1.5 font-semibold">{money(totals.commission)}</td>
                <td className={clsx('mt5-num px-1.5 font-semibold', pnlClass(totals.profit))}>
                  {money(totals.profit)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Journal tab ────────────────────────────────────────────────────────── */

function JournalTab() {
  const [rows, setRows] = useState<JournalEntry[]>(() => journal.getEntries());

  useEffect(() => journal.subscribe(setRows), []);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="mt5-toolbar">
        <button type="button" onClick={() => journal.clear()} className="mt5-tbtn">
          <Trash2 className="w-3 h-3" aria-hidden />
          Clear
        </button>
        <span className="mt5-sep" />
        <span className="text-text-secondary">
          {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} this session
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-[1]">
            <tr>
              <th className="text-left px-1.5 w-20">Time</th>
              <th className="text-left px-1.5 w-24">Source</th>
              <th className="text-left px-1.5">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="mt5-row">
                <td className="mt5-num !text-left px-1.5 text-text-secondary">
                  {new Date(e.at).toISOString().slice(11, 19)}
                </td>
                <td className="px-1.5 text-text-secondary">{e.source}</td>
                <td
                  className={clsx(
                    'px-1.5',
                    e.level === 'error' && 'text-sell',
                    e.level === 'success' && 'text-buy',
                  )}
                >
                  {e.message}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-2 text-text-tertiary">
                  Nothing logged yet this session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── The dock ───────────────────────────────────────────────────────────── */

export default function Toolbox({
  tab,
  onTabChange,
}: {
  tab: ToolboxTab;
  onTabChange: (t: ToolboxTab) => void;
}) {
  const positions = useTradingStore((s) => s.positions);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);

  /* News mounts a third-party widget; keeping it alive behind a hidden div
   * would leave it fetching while nobody looks. Mounted on demand, and the
   * ref records whether it has ever been opened so the first paint is not
   * charged to the tab switch. */
  const newsSeen = useRef(false);
  if (tab === 'news') newsSeen.current = true;

  const tabs: { id: ToolboxTab; label: string; badge?: number }[] = [
    { id: 'trade', label: 'Trade', badge: positions.length + pendingOrders.length },
    { id: 'history', label: 'History' },
    { id: 'news', label: 'News' },
    { id: 'journal', label: 'Journal' },
  ];

  return (
    <div className="mt5-dock h-full min-h-0 flex flex-col bg-bg-primary border-t border-border-primary">
      {/* Panel first, tabs last. MetaTrader anchors the Toolbox's tabs to the
          BOTTOM edge of the window — they sit under the blotter, not above
          it — which is the opposite of every web tab strip and one of the
          details that makes a screenshot read as MetaTrader at a glance. */}
      <div className="flex-1 min-h-0">
        {tab === 'trade' && <TradeTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'news' && <TradingViewNewsTimeline />}
        {tab === 'journal' && <JournalTab />}
      </div>
      <div className="mt5-tabs mt5-tabs--bottom" role="tablist" aria-label="Toolbox">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTabChange(t.id)}
            className="mt5-tab"
          >
            {t.label}
            {t.badge ? <span className="text-text-tertiary">({t.badge})</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
