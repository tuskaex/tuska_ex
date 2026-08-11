'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Loader2, Plus, RefreshCw, Search, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PaginatedResponse, SubAdmin } from '@/types';
import RowMenu from './RowMenu';
import { PERMISSION_GROUPS, groupChecked, toggleGroup } from './permissions';

const EMPTY_FORM = {
  email: '',
  password: '',
  confirm: '',
  first_name: '',
  last_name: '',
  phone: '',
  pnl_share_pct: '',
};

export default function SubAdminsPage() {
  const [items, setItems] = useState<SubAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [forbidden, setForbidden] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [checked, setChecked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(perPage),
      };
      if (search.trim()) params.search = search.trim();
      const res = await adminApi.get<PaginatedResponse<SubAdmin>>('/sub-admins', params);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setForbidden(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load sub-admins';
      // A refusal is not an empty list. Without this the page rendered
      // "No sub-admins yet" plus a create button to anyone who typed the URL,
      // which reads as a broken screen rather than one they may not use.
      if (/super admin/i.test(msg) || /Permission/i.test(msg)) setForbidden(true);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setChecked([]);
    setShowModal(true);
  };

  const submit = async () => {
    if (!form.first_name.trim()) return toast.error('Full name is required');
    if (!form.email.trim()) return toast.error('Email is required');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.password !== form.confirm) return toast.error('The two passwords do not match');
    if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 7) {
      return toast.error('Enter a valid mobile number');
    }
    setSubmitting(true);
    try {
      await adminApi.post('/sub-admins', {
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        permissions: checked,
        pnl_share_pct: form.pnl_share_pct === '' ? null : Number(form.pnl_share_pct),
      });
      toast.success('Sub-admin created');
      setShowModal(false);
      void fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create sub-admin');
    } finally {
      setSubmitting(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / perPage));

  if (forbidden) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-lg font-semibold text-text-primary">Sub-admins</h1>
        <div className="mt-4 bg-bg-secondary border border-border-primary rounded-md p-6 text-xs text-text-secondary max-w-lg">
          <p className="text-text-primary font-medium mb-1">
            This screen is for super admins.
          </p>
          <p>
            Tenants are created and assigned by the platform owner. To change your
            own brand, open <span className="text-accent">Branding</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Sub-admins</h1>
          <p className="text-xxs text-text-tertiary mt-0.5">
            White-label tenants. Each one owns a pool of clients and sees only that pool.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchData()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary hover:text-text-primary transition-fast"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white hover:opacity-90 transition-fast"
          >
            <Plus size={13} />
            New sub-admin
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by code, name, email or mobile"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="animate-spin text-text-tertiary" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-bg-secondary border border-border-primary rounded-md text-center text-xs text-text-tertiary py-12">
          No sub-admins yet.
        </div>
      ) : (
        <div className="bg-bg-secondary border border-border-primary rounded-md overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-primary text-text-tertiary">
                <th className="text-left font-medium px-3 py-2">Code</th>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">Email</th>
                <th className="text-left font-medium px-3 py-2">Mobile</th>
                <th className="text-right font-medium px-3 py-2">P&amp;L share</th>
                <th className="text-right font-medium px-3 py-2">Clients</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-border-primary last:border-0">
                  <td className="px-3 py-2 font-mono text-text-secondary">{s.code || '—'}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/sub-admins/${s.id}`}
                      className="text-text-primary hover:text-accent"
                    >
                      {s.full_name || '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{s.email}</td>
                  <td className="px-3 py-2 tabular-nums text-text-secondary">
                    {s.phone || '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                    {s.pnl_share_pct === null ? '—' : `${s.pnl_share_pct.toFixed(2)}%`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                    {s.user_count}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xxs uppercase',
                        s.status === 'active'
                          ? 'bg-buy/10 text-buy'
                          : s.status === 'suspended'
                            ? 'bg-bg-tertiary text-text-tertiary'
                            : 'bg-sell/10 text-sell',
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <RowMenu sub={s} onChanged={() => void fetchData()} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded border border-border-primary disabled:opacity-40"
          >
            Prev
          </button>
          <span className="tabular-nums">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded border border-border-primary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-bg-base/70 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-primary rounded-md shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-border-primary flex items-center gap-2">
              <ShieldCheck size={15} className="text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">New sub-admin</h2>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name">
                  <input
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mobile">
                  <input
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className={inputCls}
                  />
                </Field>
                <Field label="P&L share %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.pnl_share_pct}
                    onChange={(e) => setForm((f) => ({ ...f, pnl_share_pct: e.target.value }))}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Password (min 8)">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    className={cn(
                      inputCls,
                      form.confirm && form.confirm !== form.password && 'border-sell',
                    )}
                  />
                </Field>
              </div>

              <div>
                <span className="block text-xxs text-text-tertiary mb-1.5">
                  Permissions — granted on top of the defaults every sub-admin gets
                </span>
                <div className="border border-border-primary rounded-md p-2.5 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {PERMISSION_GROUPS.filter((g) => !g.sensitive).map((g) => (
                      <PermissionRow
                        key={g.key}
                        label={g.label}
                        hint={g.hint}
                        checked={groupChecked(g, checked)}
                        onToggle={() => setChecked((c) => toggleGroup(g, c))}
                      />
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border-primary">
                    <span className="block text-xxs text-sell mb-1.5">
                      These move money or change positions — grant deliberately
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {PERMISSION_GROUPS.filter((g) => g.sensitive).map((g) => (
                        <PermissionRow
                          key={g.key}
                          label={g.label}
                          hint={g.hint}
                          checked={groupChecked(g, checked)}
                          onToggle={() => setChecked((c) => toggleGroup(g, c))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border-primary flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                className="px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <Loader2 size={12} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary';

function PermissionRow({
  label, hint, checked, onToggle,
}: {
  label: string; hint?: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-0.5" />
      <span>
        {label}
        {hint && <span className="block text-xxs text-text-tertiary">{hint}</span>}
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xxs text-text-tertiary mb-1">{label}</span>
      {children}
    </div>
  );
}
