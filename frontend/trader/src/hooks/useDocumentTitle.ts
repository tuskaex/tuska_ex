import { useEffect } from 'react';
import { useTradingStore } from '@/stores/tradingStore';
import { useBrandName } from '@/hooks/useTenantBrand';

/**
 * Updates the browser tab title with the selected symbol and live price,
 * e.g. "▲ XAUUSD 4,757.37 | TuskaEx". Restores original title on unmount.
 */
export function useDocumentTitle() {
  const selectedSymbol = useTradingStore((s) => s.selectedSymbol);
  const tick = useTradingStore((s) => s.prices[s.selectedSymbol]);
  const prevBid = useTradingStore((s) => s.prevPrices[s.selectedSymbol]);
  const instruments = useTradingStore((s) => s.instruments);
  /* TuskaEx on its own hosts; the tenant's name (or '' while it resolves) on a
   * white-label domain, so a broker's client never sees "| TuskaEx". */
  const brandName = useBrandName();

  useEffect(() => {
    const original = brandName;
    const suffix = original ? ` | ${original}` : '';

    if (!selectedSymbol) {
      if (original) document.title = original;
      return;
    }

    const inst = instruments.find((i) => i.symbol === selectedSymbol);
    const digits = inst?.digits ?? 2;

    if (!tick) {
      document.title = `${selectedSymbol}${suffix}`;
      return;
    }

    const price = tick.bid.toFixed(digits);
    let arrow = '';
    if (prevBid !== undefined) {
      if (tick.bid > prevBid) arrow = '▲ ';
      else if (tick.bid < prevBid) arrow = '▼ ';
    }

    document.title = `${arrow}${selectedSymbol} ${price}${suffix}`;

    return () => {
      if (original) document.title = original;
    };
  }, [selectedSymbol, tick, prevBid, instruments, brandName]);
}
