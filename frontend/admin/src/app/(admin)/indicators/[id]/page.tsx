'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Wand2, Rocket, Ban, Trash2, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { IndicatorPreview } from '@/components/indicators/IndicatorPreview';
import { LANGUAGE_LABEL, StatusBadge, type IndicatorSummary } from '@/components/indicators/shared';

interface IndicatorDetail extends IndicatorSummary {
  source_code: string;
  compiled_js: string | null;
  conversion_notes: string[];
}

const RESOLUTIONS = [
  { value: '1', label: 'M1' }, { value: '5', label: 'M5' }, { value: '15', label: 'M15' },
  { value: '60', label: 'H1' }, { value: '240', label: 'H4' }, { value: '1D', label: 'D1' },
];

const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-fast disabled:opacity-50 disabled:cursor-not-allowed';

export default function IndicatorEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [row, setRow] = useState<IndicatorDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'' | 'pine' | 'mql4' | 'mql5'>('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<null | 'save' | 'convert' | 'publish' | 'disable' | 'delete'>(null);
  const [symbol, setSymbol] = useState('XAUUSD');
  const [symbolInput, setSymbolInput] = useState('XAUUSD');
  const [resolution, setResolution] = useState('15');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const apply = useCallback((d: IndicatorDetail) => {
    setRow(d);
    setName(d.name);
    setLanguage(d.source_language);
    setCode(d.source_code);
  }, []);

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      apply(await adminApi.get<IndicatorDetail>(`/indicators/${params.id}`));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load indicator');
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Conversion runs in the background on the server; poll until it settles.
  const converting = row?.conversion_state === 'running';
  useEffect(() => {
    if (!converting || !row) return;
    const t = setInterval(async () => {
      try {
        const d = await adminApi.get<IndicatorDetail>(`/indicators/${row.id}`);
        setRow(d);
        if (d.conversion_state === 'idle') toast.success('Converted. Check it on the chart below.');
        if (d.conversion_state === 'failed') toast.error(d.conversion_error || 'Conversion failed');
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(t);
  }, [converting, row]);

  const dirty = isNew || !row || name !== row.name || code !== row.source_code
    || (language || row.source_language) !== row.source_language;

  const save = async (): Promise<IndicatorDetail | null> => {
    if (!name.trim()) { toast.error('Give the indicator a name'); return null; }
    if (!code.trim()) { toast.error('Paste the indicator code'); return null; }
    setBusy('save');
    try {
      const body = { name: name.trim(), source_code: code, source_language: language || null };
      const d = isNew
        ? await adminApi.post<IndicatorDetail>('/indicators', body)
        : await adminApi.put<IndicatorDetail>(`/indicators/${params.id}`, body);
      apply(d);
      if (isNew) router.replace(`/indicators/${d.id}`);
      return d;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const convert = async () => {
    const saved = dirty ? await save() : row;
    if (!saved) return;
    setBusy('convert');
    try {
      setRow(await adminApi.post<IndicatorDetail>(`/indicators/${saved.id}/convert`));
      toast.success('Converting… this usually takes under a minute.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to start conversion');
    } finally {
      setBusy(null);
    }
  };

  const action = async (kind: 'publish' | 'disable') => {
    if (!row) return;
    setBusy(kind);
    try {
      setRow(await adminApi.post<IndicatorDetail>(`/indicators/${row.id}/${kind}`));
      toast.success(kind === 'publish'
        ? 'Published. Traders see it after reloading their chart.'
        : 'Disabled. It no longer loads in the terminals.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${kind}`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!row) return;
    setBusy('delete');
    try {
      await adminApi.delete(`/indicators/${row.id}`);
      toast.success('Indicator deleted');
      router.push('/indicators');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  const canPublish = !!row?.compiled_js && !converting && !dirty
    && (row.status !== 'published' || row.draft_differs);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/indicators" className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:bg-bg-hover">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              {isNew ? 'New Indicator' : row?.name}
              {row && <StatusBadge status={row.status} />}
            </h1>
            {row && (
              <p className="text-xxs text-text-tertiary mt-0.5">
                {row.status === 'published'
                  ? `Version ${row.version} is live in the terminals.`
                  : row.status === 'disabled' ? 'Not loaded in the terminals.' : 'Not published yet.'}
                {row.status === 'published' && row.draft_differs && ' The converted draft below has changes that are not published.'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => void save()} disabled={!!busy || converting || !dirty}
            className={cn(btn, 'border-border-primary text-text-secondary hover:bg-bg-hover')}>
            {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <button type="button" onClick={() => void convert()} disabled={!!busy || converting}
            className={cn(btn, 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25')}>
            {converting || busy === 'convert' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {converting ? 'Converting…' : row?.compiled_js ? 'Convert again' : 'Convert'}
          </button>
          {row && (
            <button type="button" onClick={() => void action('publish')} disabled={!!busy || !canPublish}
              title={dirty ? 'Save and convert your edits first' : undefined}
              className={cn(btn, 'bg-success/15 text-success border-success/30 hover:bg-success/25')}>
              {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
              {row.status === 'published' ? 'Publish changes' : 'Publish'}
            </button>
          )}
          {row?.status === 'published' && (
            <button type="button" onClick={() => void action('disable')} disabled={!!busy}
              className={cn(btn, 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25')}>
              <Ban size={14} /> Disable
            </button>
          )}
          {row && (confirmDelete ? (
            <button type="button" onClick={() => void remove()} disabled={!!busy}
              className={cn(btn, 'bg-danger text-white border-danger')}>
              {busy === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Confirm delete
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={!!busy}
              className={cn(btn, 'text-danger border-danger/30 hover:bg-danger/15')}>
              <Trash2 size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xxs text-text-tertiary mb-1">Name (shown in the terminals&apos; Indicators list)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
                className="w-full text-xs py-1.5 px-2 bg-bg-input border border-border-primary rounded-md"
                placeholder="e.g. Gold Trend Signals" />
            </div>
            <div>
              <label className="block text-xxs text-text-tertiary mb-1">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="w-full text-xs py-1.5 px-2 bg-bg-input border border-border-primary rounded-md">
                <option value="">Detect automatically</option>
                <option value="pine">Pine Script (TradingView)</option>
                <option value="mql4">MQL4 (MetaTrader 4)</option>
                <option value="mql5">MQL5 (MetaTrader 5)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xxs text-text-tertiary mb-1">Indicator code</label>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
              className="w-full h-[460px] text-xs font-mono py-2 px-2 bg-bg-input border border-border-primary rounded-md resize-y"
              placeholder={'//@version=5\nindicator("My indicator", overlay=true)\n...'} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xxs text-text-tertiary mb-1">Preview symbol</label>
              <input value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                onBlur={() => setSymbol(symbolInput.trim() || 'XAUUSD')}
                onKeyDown={(e) => { if (e.key === 'Enter') setSymbol(symbolInput.trim() || 'XAUUSD'); }}
                className="w-28 text-xs py-1.5 px-2 bg-bg-input border border-border-primary rounded-md" />
            </div>
            <div>
              <label className="block text-xxs text-text-tertiary mb-1">Timeframe</label>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)}
                className="text-xs py-1.5 px-2 bg-bg-input border border-border-primary rounded-md">
                {RESOLUTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {row && (
              <span className="text-xxs text-text-tertiary pb-2 ml-auto">
                {LANGUAGE_LABEL[row.source_language]}
              </span>
            )}
          </div>

          {row?.conversion_state === 'failed' && row.conversion_error && (
            <div className="rounded-md bg-danger/10 border border-danger/30 text-danger text-xs px-3 py-2">
              {row.conversion_error}
            </div>
          )}

          {row?.compiled_js ? (
            <IndicatorPreview name={row.name} studyId={row.study_id} js={row.compiled_js}
              symbol={symbol} resolution={resolution} />
          ) : (
            <div className="h-[460px] rounded-md border border-dashed border-border-primary flex items-center justify-center text-xs text-text-tertiary text-center px-6">
              {converting
                ? 'Converting the code…'
                : 'Paste the code and press Convert. The converted indicator appears here on a live chart.'}
            </div>
          )}

          {row && row.unsupported_features.length > 0 && (
            <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-warning mb-1">
                <AlertTriangle size={13} /> Not reproduced on our charts
              </div>
              <ul className="list-disc pl-5 text-xs text-text-secondary space-y-0.5">
                {row.unsupported_features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          {row && row.conversion_notes.length > 0 && (
            <div className="rounded-md bg-bg-secondary border border-border-primary px-3 py-2">
              <div className="text-xs font-medium text-text-primary mb-1">Conversion notes</div>
              <ul className="list-disc pl-5 text-xs text-text-secondary space-y-0.5">
                {row.conversion_notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          {row?.compiled_js && (
            <details className="rounded-md bg-bg-secondary border border-border-primary">
              <summary className="px-3 py-2 text-xs text-text-secondary cursor-pointer">Converted code</summary>
              <pre className="px-3 pb-3 text-xxs font-mono text-text-secondary overflow-auto max-h-80 whitespace-pre">
                {row.compiled_js}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
