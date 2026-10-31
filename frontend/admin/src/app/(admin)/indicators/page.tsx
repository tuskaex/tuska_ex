'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { Loader2, Plus, RefreshCw, LineChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { LANGUAGE_LABEL, StatusBadge, type IndicatorSummary } from '@/components/indicators/shared';

export default function IndicatorsPage() {
  const [rows, setRows] = useState<IndicatorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{ indicators: IndicatorSummary[] }>('/indicators');
      setRows(res.indicators ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load indicators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Chart Indicators</h1>
          <p className="text-xxs text-text-tertiary mt-0.5">
            Paste a TradingView Pine Script or MetaTrader MQL4/MQL5 indicator. It is converted for our charts,
            you check it on a live chart, and <strong>Publish</strong> adds it to the Indicators list in the web and
            desktop terminals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/indicators/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-fast"
          >
            <Plus size={14} /> New Indicator
          </Link>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:bg-bg-hover transition-fast"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-text-tertiary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-bg-secondary border border-border-primary rounded-md text-center text-xs text-text-tertiary py-12">
          <LineChart size={28} className="mx-auto mb-2 text-text-tertiary/40" />
          No custom indicators yet. Click <strong>New Indicator</strong> and paste the code.
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border-primary rounded-md overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-xxs text-text-tertiary border-b border-border-primary">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Language</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Not supported</th>
                <th className="px-3 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover">
                  <td className="px-3 py-2">
                    <Link href={`/indicators/${r.id}`} className="text-text-primary font-medium hover:text-accent">
                      {r.name}
                    </Link>
                    {r.draft_differs && r.status === 'published' && (
                      <span className="ml-2 text-xxs text-warning">unpublished changes</span>
                    )}
                    {r.conversion_state === 'running' && (
                      <span className="ml-2 text-xxs text-text-tertiary">converting…</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{LANGUAGE_LABEL[r.source_language]}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2 text-text-secondary">{r.version || '—'}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {r.unsupported_features.length ? `${r.unsupported_features.length} item(s)` : '—'}
                  </td>
                  <td className="px-3 py-2 text-text-tertiary">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
