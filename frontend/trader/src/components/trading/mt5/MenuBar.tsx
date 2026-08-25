'use client';

/**
 * The menu bar — MetaTrader's `File View Insert Charts Options Help` row, with
 * the account identity printed at the right end.
 *
 * That identity line is the reason this row exists rather than being a nicer
 * toolbar. MetaTrader prints `MetaTrader 5 - 5230995: MetaQuotes-Demo, Demo
 * Account - Hedge` there, and it is the only place in the whole window that
 * answers "which account am I about to trade?" without the trader hunting for
 * it. On a platform where one login owns several accounts — and where a demo
 * and a live account look identical everywhere else — putting that in the
 * chrome is a safety feature, not decoration.
 *
 * The menus are real: every item does something this app can actually do. An
 * MT5 menu bar rendered as dead labels would be worse than no menu bar, so
 * items with no backing action are simply not listed. That is why File has no
 * "Save As" and Insert has no "Objects".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useChartBrand } from '@/hooks/useTenantBrand';
import type { ChartApi } from '@/components/charts/TradingViewChart';

interface MenuBarProps {
  api: ChartApi | null;
  onNewOrder: () => void;
  marketWatchOpen: boolean;
  onToggleMarketWatch: () => void;
  toolboxOpen: boolean;
  onToggleToolbox: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}

type Item =
  | { kind: 'separator' }
  | {
      kind: 'item';
      label: string;
      /** Rendered right-aligned, as MetaTrader prints its shortcuts. */
      accel?: string;
      /** Draws MetaTrader's tick to the left of the label. */
      checked?: boolean;
      onSelect: () => void;
    };

function Dropdown({
  label,
  items,
  open,
  onOpen,
  onClose,
}: {
  label: string;
  items: Item[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        /* MetaTrader opens whichever menu the pointer crosses once one is
         * already open — the whole bar behaves as a single control after the
         * first click. Without this, reaching Charts from File means a click
         * to close and another to open. */
        onMouseEnter={() => {
          if (!open) onOpen();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx('mt5-menu-btn', open && 'is-open')}
      >
        {label}
      </button>
      {open && (
        <div className="mt5-menu" role="menu">
          {items.map((item, i) =>
            item.kind === 'separator' ? (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`sep${i}`} className="mt5-menu-sep" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                className="mt5-menu-item"
              >
                <span className="mt5-menu-check" aria-hidden>
                  {item.checked ? '✓' : ''}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.accel && <span className="mt5-menu-accel">{item.accel}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function MenuBar({
  api,
  onNewOrder,
  marketWatchOpen,
  onToggleMarketWatch,
  toolboxOpen,
  onToggleToolbox,
  fullscreen,
  onToggleFullscreen,
}: MenuBarProps) {
  const router = useRouter();
  const brand = useChartBrand();
  const activeAccount = useTradingStore((s) => s.activeAccount);
  const oneClick = useUIStore((s) => s.oneClickTrading);
  const setOneClick = useUIStore((s) => s.setOneClickTrading);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(null), []);

  /* Dismiss on outside click and on Escape. Both, not one: a menu that only
   * closes on Escape traps a mouse user, and one that only closes on outside
   * click traps a keyboard user. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const menus: { label: string; items: Item[] }[] = [
    {
      label: 'File',
      items: [
        { kind: 'item', label: 'New Order…', accel: 'F9', onSelect: onNewOrder },
        { kind: 'separator' },
        { kind: 'item', label: 'Accounts', onSelect: () => router.push('/accounts') },
        { kind: 'item', label: 'Open an Account…', onSelect: () => router.push('/trading/open-account') },
        { kind: 'separator' },
        { kind: 'item', label: 'Back to Dashboard', onSelect: () => router.push('/dashboard') },
      ],
    },
    {
      label: 'View',
      items: [
        {
          kind: 'item',
          label: 'Market Watch',
          accel: 'Ctrl+M',
          checked: marketWatchOpen,
          onSelect: onToggleMarketWatch,
        },
        { kind: 'item', label: 'Toolbox', accel: 'Ctrl+T', checked: toolboxOpen, onSelect: onToggleToolbox },
        { kind: 'separator' },
        {
          kind: 'item',
          label: 'Full Screen',
          accel: 'F11',
          checked: fullscreen,
          onSelect: onToggleFullscreen,
        },
      ],
    },
    {
      label: 'Insert',
      items: [
        {
          kind: 'item',
          label: 'Indicators…',
          onSelect: () => api?.executeActionById('insertIndicator'),
        },
      ],
    },
    {
      label: 'Charts',
      items: [
        { kind: 'item', label: 'Bar Chart', onSelect: () => api?.setChartType(0) },
        { kind: 'item', label: 'Candlesticks', onSelect: () => api?.setChartType(1) },
        { kind: 'item', label: 'Line Chart', onSelect: () => api?.setChartType(2) },
        { kind: 'separator' },
        { kind: 'item', label: 'Zoom In', onSelect: () => api?.zoom('in') },
        { kind: 'item', label: 'Zoom Out', onSelect: () => api?.zoom('out') },
        { kind: 'item', label: 'Reset Scale', onSelect: () => api?.resetScale() },
        { kind: 'separator' },
        { kind: 'item', label: 'Properties…', onSelect: () => api?.executeActionById('chartProperties') },
      ],
    },
    {
      label: 'Options',
      items: [
        {
          kind: 'item',
          label: 'One Click Trading',
          checked: oneClick,
          onSelect: () => setOneClick(!oneClick),
        },
        { kind: 'separator' },
        /* MetaTrader keeps its colour scheme under Charts → Properties, which
         * only re-themes the chart. Here it belongs in Options because it
         * re-themes the whole window, chart included — a "Dark Mode" buried in
         * a chart dialog would read as chart-only. */
        {
          kind: 'item',
          label: 'Dark Mode',
          checked: theme === 'dark',
          onSelect: toggleTheme,
        },
      ],
    },
    {
      label: 'Help',
      items: [{ kind: 'item', label: 'Support', onSelect: () => router.push('/support') }],
    },
  ];

  /* MetaTrader's format: `<platform> - <login>: <server>, <type> Account`.
   * The platform name is the TENANT's, not ours — on a white-label domain the
   * client has never heard of the parent platform, and this line is the most
   * prominent piece of text in the chrome. */
  const identity = activeAccount
    ? `${brand.name} - ${activeAccount.account_number}: ${
        activeAccount.account_group?.name ?? 'Standard'
      }, ${activeAccount.is_demo ? 'Demo' : 'Live'} Account`
    : `${brand.name} - no account selected`;

  return (
    <div ref={barRef} className="mt5-menubar">
      {menus.map((m) => (
        <Dropdown
          key={m.label}
          label={m.label}
          items={m.items}
          open={open === m.label}
          onOpen={() => setOpen(m.label)}
          onClose={close}
        />
      ))}
      <span className="ml-auto truncate pr-1 text-text-secondary" title={identity}>
        {identity}
      </span>
    </div>
  );
}
