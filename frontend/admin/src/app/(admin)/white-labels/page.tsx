'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { PaginatedResponse, SubAdmin } from '@/types';
import WhiteLabelManager from '../branding/WhiteLabelManager';

/** Every white-labelled broker, editable in place. */
export default function WhiteLabelsPage() {
  const [tenants, setTenants] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<PaginatedResponse<SubAdmin>>('/sub-admins', { per_page: '100' });
      setTenants(res.items || []);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">White Labels List</h1>
          <p className="text-xxs text-text-tertiary mt-0.5">
            Every white-labelled sub-broker — logo, name, colours, domain, access and account in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary hover:text-text-primary"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <Link
            href="/sub-admins"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white"
          >
            <Plus size={13} /> New sub-broker
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-text-tertiary" />
        </div>
      ) : (
        <WhiteLabelManager tenants={tenants} onChanged={() => void load()} />
      )}
    </div>
  );
}
