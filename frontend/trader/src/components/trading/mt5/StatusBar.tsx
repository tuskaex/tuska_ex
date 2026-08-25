'use client';

/**
 * The strip along the very bottom of the terminal window.
 *
 * MetaTrader's status bar carries the connection state and traffic counter on
 * the right and context help on the left. The traffic counter is meaningless
 * here — the feed is a WebSocket the browser owns — so its slot carries what a
 * trader on this platform actually needs to know instead: whether the market
 * for the symbol they are looking at is open, and whether the tick stream is
 * live.
 *
 * The two are genuinely different failure modes and both look identical on a
 * chart that has stopped moving: a closed market is normal and a dropped
 * socket is not. Printing them separately is the whole reason this strip
 * exists rather than a single "connected" dot.
 */

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { getMarketStatus } from '@/lib/marketHours';
import { wsManager, type ConnectionStatus } from '@/lib/ws/wsManager';
import { useTradingStore } from '@/stores/tradingStore';

export default function StatusBar({ symbol }: { symbol: string }) {
  const activeAccount = useTradingStore((s) => s.activeAccount);
  const instruments = useTradingStore((s) => s.instruments);
  const positions = useTradingStore((s) => s.positions);

  const [status, setStatus] = useState<ConnectionStatus>(() => wsManager.status);
  const [clock, setClock] = useState('');

  /* Braces, not a concise body: onStatusChange returns Set.delete's boolean,
   * and returning that from an effect makes React treat it as a cleanup
   * function it cannot call. */
  useEffect(() => {
    const off = wsManager.onStatusChange(setStatus);
    return () => {
      off();
    };
  }, []);

  /* UTC, matching the Market Watch caption and the platform's session
   * definitions — see the note there. */
  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const segment = instruments.find((i) => i.symbol === symbol)?.segment;
  const market = getMarketStatus(symbol, segment);

  const statusLabel =
    status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'No connection';

  return (
    <div className="mt5-status">
      <span className="truncate">
        {activeAccount
          ? `${activeAccount.account_number} — ${activeAccount.account_group?.name ?? 'Account'} · ${
              activeAccount.is_demo ? 'Demo' : 'Live'
            } · 1:${activeAccount.leverage}`
          : 'No account selected'}
      </span>

      <span className="mt5-sep" />

      <span className="truncate">
        {positions.length} position{positions.length === 1 ? '' : 's'}
      </span>

      <span className="ml-auto" />

      <span
        className={clsx('truncate', market.isOpen ? 'text-text-secondary' : 'text-sell')}
        title={market.isOpen ? undefined : market.reason}
      >
        {symbol}: {market.isOpen ? 'Market open' : 'Market closed'}
      </span>

      <span className="mt5-sep" />

      <span className="mt5-num">{clock} UTC</span>

      <span className="mt5-sep" />

      <span
        className={clsx(
          'inline-flex items-center gap-1',
          status === 'connected' ? 'text-buy' : status === 'connecting' ? 'text-warning' : 'text-sell',
        )}
      >
        <span
          className={clsx(
            'inline-block w-1.5 h-1.5 rounded-full',
            status === 'connected' ? 'bg-buy' : status === 'connecting' ? 'bg-warning' : 'bg-sell',
          )}
          aria-hidden
        />
        {statusLabel}
      </span>
    </div>
  );
}
