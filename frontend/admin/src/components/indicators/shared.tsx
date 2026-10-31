import { cn } from '@/lib/utils';

export interface IndicatorSummary {
  id: string;
  name: string;
  study_id: string;
  source_language: 'pine' | 'mql4' | 'mql5';
  status: 'draft' | 'published' | 'disabled';
  version: number;
  has_draft: boolean;
  draft_differs: boolean;
  unsupported_features: string[];
  conversion_state: 'idle' | 'running' | 'failed';
  conversion_error: string | null;
  published_at: string | null;
  updated_at: string | null;
}

export const LANGUAGE_LABEL: Record<string, string> = { pine: 'Pine Script', mql4: 'MQL4', mql5: 'MQL5' };

export function StatusBadge({ status }: { status: IndicatorSummary['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex px-1.5 py-0.5 rounded-sm text-xxs font-medium',
        status === 'published' && 'bg-success/15 text-success',
        status === 'draft' && 'bg-accent/15 text-accent',
        status === 'disabled' && 'bg-bg-tertiary text-text-tertiary border border-border-primary',
      )}
    >
      {status === 'published' ? 'Live' : status === 'draft' ? 'Draft' : 'Disabled'}
    </span>
  );
}
