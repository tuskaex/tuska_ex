'use client';

/**
 * Section 3 of the White-label page, as the platform owner sees it.
 *
 * A custom domain identifies a TENANT — it is what decides which broker a
 * visitor who signs up on it belongs to. The platform's own hostnames come from
 * the server configuration, never from this column, so the owner's row has no
 * use for one and `connect_domain` refuses it outright.
 *
 * That refusal was correct and the page was not: it rendered the self-connect
 * form to the owner, so the only way to learn the rule was to fill it in and
 * meet a red toast. Worse, before the refusal existed the form SUCCEEDED, and a
 * domain parked on the owner's row resolves through tenant_resolver._pool_id to
 * the platform pool — every signup on it landed in TuskaEx while the tenant's
 * brand rendered perfectly and their Users page stayed empty.
 *
 * So this asks the one question the self-connect form could not: which tenant.
 * It posts to /sub-admins/{id}/domain, which puts the domain on that tenant's
 * row where the pool lookup will find it.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Globe, Loader2, AlertTriangle, ExternalLink, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PaginatedResponse, SubAdmin } from '@/types';

const inputCls =
  'w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-tertiary';

/** Mirrors hostnames_for() in packages/common — apex mode answers on the apex
 *  and www, subdomain mode only on the label. Shown before submitting so the
 *  operator sees the same list nginx will be told to serve. */
function previewHosts(
  domain: string,
  mode: 'apex' | 'subdomain',
  appSub: string,
  adminSub: string | null,
): string[] {
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!d) return [];
  const hosts = mode === 'subdomain' ? [`${appSub || 'app'}.${d}`] : [d, `www.${d}`];
  if (adminSub) hosts.push(`${adminSub}.${d}`);
  return hosts;
}

export default function TenantDomainPanel({ platformIp }: { platformIp: string }) {
  const [tenants, setTenants] = useState<SubAdmin[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'apex' | 'subdomain'>('apex');
  const [host, setHost] = useState('');
  const [appSub, setAppSub] = useState('app');
  const [wantAdmin, setWantAdmin] = useState(true);
  const [adminSub, setAdminSub] = useState('admin');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.get<PaginatedResponse<SubAdmin>>('/sub-admins', {
        per_page: '100',
      });
      setTenants(res.items ?? []);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load sub-admins');
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chosen = tenants?.find((t) => t.id === target) ?? null;
  // assign_domain MOVES the domain off whoever holds it. Naming the loser up
  // front is the difference between an informed overwrite and a support ticket
  // from a tenant whose live site went dark.
  const takenFrom = host.trim()
    ? tenants?.find(
        (t) =>
          t.custom_domain &&
          t.custom_domain.toLowerCase() === host.trim().toLowerCase().replace(/^www\./, '') &&
          t.id !== target,
      ) ?? null
    : null;

  const hosts = previewHosts(host, mode, appSub, wantAdmin ? adminSub.trim() : null);

  const assign = async () => {
    if (!target) return toast.error('Choose which sub-admin this domain is for');
    if (!host.trim()) return toast.error('Enter the domain');
    setBusy(true);
    try {
      await adminApi.post(`/sub-admins/${target}/domain`, {
        domain: host.trim(),
        app_subdomain: mode === 'subdomain' ? appSub.trim() : null,
        admin_subdomain: wantAdmin ? adminSub.trim() : null,
      });
      toast.success(`Domain assigned to ${chosen?.full_name || chosen?.email}`);
      setHost('');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not assign the domain');
    } finally {
      setBusy(false);
    }
  };

  if (tenants === null) {
    return (
      <p className="flex items-center gap-2 text-xxs text-text-tertiary">
        <Loader2 size={12} className="animate-spin" /> Loading sub-admins…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xxs text-text-tertiary leading-relaxed">
        A custom domain belongs to a <span className="text-text-secondary">sub-admin</span>,
        not to the platform. It decides which broker a visitor who signs up on it
        belongs to — the platform’s own hostnames come from the server, not from
        here. Pick the tenant and the domain lands on their row.
      </p>

      {loadError && (
        <p className="flex items-start gap-2 text-xxs text-danger">
          <AlertTriangle size={12} className="mt-px shrink-0" />
          {loadError}
        </p>
      )}

      {tenants.length === 0 ? (
        <div className="rounded-md border border-border-primary bg-bg-tertiary/40 p-3">
          <p className="text-xs text-text-primary mb-1">No sub-admins yet</p>
          <p className="text-xxs text-text-tertiary leading-relaxed">
            There is nobody to give a domain to. Create the broker first in{' '}
            <Link href="/sub-admins" className="text-accent hover:underline">
              Sub-admins
            </Link>
            , then come back — or assign it from their detail page, which does
            the same thing.
          </p>
        </div>
      ) : (
        <>
          {/* ── who already holds what ── */}
          <div className="rounded-md border border-border-primary overflow-hidden">
            <div className="px-2.5 py-1.5 bg-bg-tertiary/60 border-b border-border-primary">
              <span className="text-xxs uppercase tracking-wide text-text-tertiary">
                Current assignments
              </span>
            </div>
            <div className="divide-y divide-border-primary">
              {tenants.map((t) => (
                <div key={t.id} className="px-2.5 py-2 flex items-center gap-3 text-xxs">
                  <Link
                    href={`/sub-admins/${t.id}`}
                    className="text-text-primary hover:text-accent truncate min-w-0 flex-1"
                  >
                    {t.full_name || t.email}
                  </Link>
                  <span className="flex items-center gap-1 text-text-tertiary shrink-0">
                    <Users size={10} />
                    {t.user_count}
                  </span>
                  {t.custom_domain ? (
                    <span className="flex items-center gap-1 font-mono text-text-secondary shrink-0">
                      {t.custom_domain}
                      {t.custom_domain_status === 'READY' && (
                        <ExternalLink size={10} className="text-success" />
                      )}
                    </span>
                  ) : (
                    <span className="text-text-tertiary shrink-0">no domain</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── assign ── */}
          <label className="block">
            <span className="block text-xxs text-text-tertiary mb-1">
              Assign this domain to
            </span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a sub-admin…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email}
                  {t.custom_domain ? ` — currently ${t.custom_domain}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="block text-xxs uppercase tracking-wide text-text-tertiary mb-1.5">
              Hosting mode
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['apex', 'subdomain'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'text-left p-3 rounded-md border transition-fast',
                    mode === m
                      ? 'border-accent bg-accent/5'
                      : 'border-border-primary hover:border-border-secondary',
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-text-primary">
                    <span
                      className={cn(
                        'w-3 h-3 rounded-full border-2 shrink-0',
                        mode === m ? 'border-accent bg-accent' : 'border-border-secondary',
                      )}
                    />
                    {m === 'apex' ? 'Apex mode' : 'Subdomain mode'}
                  </span>
                  <span className="block text-xxs text-text-tertiary mt-1 leading-relaxed">
                    {m === 'apex'
                      ? 'We serve their portal on broker.com and www.broker.com. Visitors landing on the root go straight to login.'
                      : 'We serve only app.broker.com. They keep the apex for their own marketing site.'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">Their domain</span>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="broker.com"
                className={inputCls}
              />
              <span className="block text-xxs text-text-tertiary mt-1">
                Apex only — no https://, no www, no path.
              </span>
            </label>

            {mode === 'subdomain' && (
              <label className="block">
                <span className="block text-xxs text-text-tertiary mb-1">App subdomain</span>
                <input
                  value={appSub}
                  onChange={(e) => setAppSub(e.target.value)}
                  placeholder="app"
                  className={inputCls}
                />
              </label>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={wantAdmin}
                onChange={(e) => setWantAdmin(e.target.checked)}
              />
              Also host their admin panel on this domain
            </label>
            {wantAdmin && (
              <input
                value={adminSub}
                onChange={(e) => setAdminSub(e.target.value)}
                placeholder="admin"
                className={cn(inputCls, 'mt-1.5')}
              />
            )}
          </div>

          {hosts.length > 0 && (
            <div className="rounded-md border border-border-primary bg-bg-tertiary/40 p-2.5">
              <span className="block text-xxs uppercase tracking-wide text-text-tertiary mb-1">
                Will answer on
              </span>
              <ul className="space-y-0.5">
                {hosts.map((h) => (
                  <li key={h} className="font-mono text-xxs text-text-secondary">
                    {h}
                  </li>
                ))}
              </ul>
              {platformIp && (
                <p className="text-xxs text-text-tertiary mt-1.5 leading-relaxed">
                  Each needs an A record to{' '}
                  <span className="font-mono text-text-secondary">{platformIp}</span>, and
                  the server must be told to serve them —{' '}
                  <span className="font-mono">connect-tenant-domain.sh</span>.
                </p>
              )}
            </div>
          )}

          {takenFrom && (
            <p className="flex items-start gap-2 text-xxs text-warning">
              <AlertTriangle size={12} className="mt-px shrink-0" />
              <span>
                <span className="font-mono">{takenFrom.custom_domain}</span> is currently
                on <span className="text-text-secondary">
                  {takenFrom.full_name || takenFrom.email}
                </span>
                . Assigning it moves it — their site stops answering on this domain.
              </span>
            </p>
          )}

          <button
            type="button"
            onClick={() => void assign()}
            disabled={busy || !target || !host.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            Assign domain
          </button>
        </>
      )}
    </div>
  );
}
