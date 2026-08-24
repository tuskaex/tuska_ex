'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Globe, Loader2, RefreshCw, Unplug, CheckCircle2, AlertTriangle, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  DomainState, SubAdmin, SubAdminDomain, PaginatedResponse,
} from '@/types';
import { CopyField } from './ReferralLink';

const inputCls =
  'w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-tertiary';

/** What each lifecycle state means to the person reading it. Deliberately says
 *  what happens next rather than just naming the state. */
const STATUS_COPY: Record<string, { label: string; tone: 'wait' | 'ok' | 'bad'; hint: string }> = {
  PENDING_DNS: {
    label: 'Waiting for DNS',
    tone: 'wait',
    hint: 'Add the records below at your registrar, then click Verify. Changes can take a few minutes to spread.',
  },
  DNS_VERIFIED: {
    label: 'DNS verified',
    tone: 'ok',
    hint: 'Your domain points at us. The platform owner now has to serve it and issue the certificate — you will see “Live” here once they have.',
  },
  PROVISIONING: {
    label: 'Being set up',
    tone: 'wait',
    hint: 'The platform owner is configuring the server for this domain.',
  },
  READY: {
    label: 'Live with HTTPS',
    tone: 'ok',
    hint: 'Your domain is serving your brand.',
  },
  FAILED: {
    label: 'Setup failed',
    tone: 'bad',
    hint: 'Something went wrong. Check the message, fix it, then verify again.',
  },
};

/** The platform owner's branch of section 3.
 *
 *  connect_domain acts on the CALLER's row and refuses a super-admin, because a
 *  domain there resolves through tenant_resolver._pool_id to the PLATFORM pool:
 *  the tenant's brand renders perfectly while every signup lands in the
 *  platform's own book and their Users page stays empty. Nothing errors and
 *  nothing logs, which is why the guard exists.
 *
 *  The guard was right and this page was wrong — it rendered the self-connect
 *  form anyway, so the only way to learn the rule was to fill the form in and
 *  meet a red toast. This asks the question the self-connect form cannot (which
 *  tenant) and posts to /sub-admins/{id}/domain, which puts the domain where
 *  the pool lookup will find it, then shows the A records that come back. */
function AssignToTenant({ onChanged }: { onChanged: () => void }) {
  const [tenants, setTenants] = useState<SubAdmin[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [host, setHost] = useState('');
  const [mode, setMode] = useState<'apex' | 'subdomain'>('apex');
  const [appSub, setAppSub] = useState('app');
  const [wantAdmin, setWantAdmin] = useState(true);
  const [adminSub, setAdminSub] = useState('admin');
  const [busy, setBusy] = useState(false);
  const [assigned, setAssigned] = useState<SubAdminDomain | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await adminApi.get<PaginatedResponse<SubAdmin>>('/sub-admins', {
          page: '1',
          per_page: '100',
        });
        const items = res.items || [];
        setTenants(items);
        // With exactly one tenant there is nothing to choose, and making the
        // operator choose it anyway is the whole friction. Two or more stays
        // unselected on purpose: which broker a domain belongs to is not
        // something to guess, and guessing wrong is the silent
        // misattribution this screen exists to prevent.
        if (items.length === 1) setTenantId(items[0]!.id);
      } catch {
        // A failed list leaves the picker empty and the button disabled, which
        // is a readable state on its own — no toast on page load.
      }
    })();
  }, []);

  const selected = tenants.find((t) => t.id === tenantId) || null;

  // Who holds the typed domain right now, if anyone. Computed independently of
  // the picker so the three cases below can be told apart — an earlier version
  // folded this into one `t.id !== tenantId` test, which matched EVERY tenant
  // while the picker was still empty and warned that the current, rightful
  // holder was about to lose a domain the operator had not yet moved.
  const typed = host.trim().toLowerCase();
  const holder = typed ? tenants.find((t) => t.domain?.custom_domain === typed) : undefined;
  // assign_domain MOVES rather than copies, so name the tenant who would lose
  // it — but only once a DIFFERENT tenant is actually selected.
  const stealingFrom = holder && tenantId && holder.id !== tenantId ? holder : undefined;
  const alreadyHere = Boolean(holder && tenantId && holder.id === tenantId);
  // Everything else is ready and only the owner is missing — the state that
  // reads as a broken button rather than an unfinished form.
  const needsTenant = !tenantId && typed.length >= 3;

  const assign = async () => {
    setBusy(true);
    try {
      const res = await adminApi.post<SubAdmin>(`/sub-admins/${tenantId}/domain`, {
        domain: host.trim(),
        app_subdomain: mode === 'subdomain' ? appSub.trim() || null : null,
        admin_subdomain: wantAdmin ? adminSub.trim() || null : null,
      });
      setAssigned(res.domain);
      toast.success('Domain assigned to the tenant');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not assign the domain');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 p-3 rounded-md border border-border-primary bg-bg-tertiary/40">
        <Globe size={14} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xxs text-text-secondary leading-relaxed">
          A custom domain identifies a <strong className="text-text-primary">tenant</strong>,
          not the platform. On your own account it would render their brand while
          every signup landed in your pool — so pick who it belongs to and it
          goes on their row instead.
        </p>
      </div>

      <div>
        <span className="block text-xxs uppercase tracking-wide text-text-tertiary mb-1.5">
          Which tenant
        </span>
        {/* Outlined once a domain has been typed and this is still empty. It is
            the only field the operator cannot skip and the easiest to miss —
            everything else was filled in and the button just sat there dead. */}
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className={cn(inputCls, needsTenant && 'border-warning')}
        >
          <option value="">Select a sub-admin…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name || t.email} ({t.code})
              {t.domain?.custom_domain ? ` — holds ${t.domain.custom_domain}` : ''}
            </option>
          ))}
        </select>
        {tenants.length === 0 && (
          <p className="text-xxs text-text-tertiary mt-1">
            No sub-admins yet. Create one first — a domain needs an owner.
          </p>
        )}
      </div>

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
              <span className="block text-xs text-text-primary mb-0.5">
                {m === 'apex' ? 'Apex mode' : 'Subdomain mode'}
              </span>
              <span className="block text-xxs text-text-tertiary">
                {m === 'apex'
                  ? 'The portal is served on broker.com and www.broker.com.'
                  : 'Only app.broker.com is served; the apex stays theirs.'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-xxs uppercase tracking-wide text-text-tertiary mb-1.5">
          Their domain
        </span>
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="broker.com"
          className={inputCls}
        />
        <p className="text-xxs text-text-tertiary mt-1">
          Apex only — no https://, no www, no path.
        </p>
      </div>

      {mode === 'subdomain' && (
        <input
          value={appSub}
          onChange={(e) => setAppSub(e.target.value)}
          placeholder="app"
          className={inputCls}
        />
      )}

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={wantAdmin}
          onChange={(e) => setWantAdmin(e.target.checked)}
        />
        Also host the admin panel on this domain
      </label>
      {wantAdmin && (
        <input
          value={adminSub}
          onChange={(e) => setAdminSub(e.target.value)}
          placeholder="admin"
          className={inputCls}
        />
      )}

      {/* Three distinct situations, and only one of them is a warning. */}
      {stealingFrom && (
        <p className="flex items-start gap-1.5 text-xxs text-warning">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          {stealingFrom.full_name || stealingFrom.email} holds this domain now and
          will lose it.
        </p>
      )}
      {alreadyHere && (
        <p className="flex items-start gap-1.5 text-xxs text-text-tertiary">
          <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-success" />
          Already assigned to this tenant — assigning again just re-reads the
          records below.
        </p>
      )}
      {holder && !tenantId && (
        <p className="text-xxs text-text-tertiary">
          {typed} is currently on {holder.full_name || holder.email}.
        </p>
      )}

      <button
        type="button"
        disabled={busy || !tenantId || host.trim().length < 3}
        onClick={() => void assign()}
        className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-md bg-accent text-white disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
        Assign domain to tenant
      </button>
      {/* A disabled button with no stated reason reads as a broken page — which
          is how this screen got reported the first time. */}
      {!busy && (!tenantId || host.trim().length < 3) && (
        <p className="text-xxs text-text-tertiary">
          {!tenantId
            ? 'Pick a tenant above to enable this — the highlighted field.'
            : 'Enter the tenant’s domain to enable this.'}
        </p>
      )}

      {assigned?.custom_domain && (
        <div className="pt-3 border-t border-border-primary space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 size={13} />
            {assigned.custom_domain} is on{' '}
            {selected?.full_name || selected?.email || 'the tenant'}
          </div>
          <p className="text-xxs text-text-tertiary">
            Add these at the registrar for {assigned.custom_domain}:
          </p>
          <table className="w-full text-xxs">
            <thead className="text-text-tertiary">
              <tr>
                <th className="text-left font-normal pb-1">Type</th>
                <th className="text-left font-normal pb-1">Host</th>
                <th className="text-left font-normal pb-1">Value</th>
              </tr>
            </thead>
            <tbody className="text-text-primary font-mono">
              {assigned.dns_records.map((r) => (
                <tr key={`${r.type}-${r.host}`}>
                  <td className="py-0.5 pr-2">{r.type}</td>
                  <td className="py-0.5 pr-2">{r.host}</td>
                  <td className="py-0.5">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <CopyField
            value={assigned.dns_records
              .map((r) => `${r.type}\t${r.host}\t${r.value}`)
              .join('\n')}
          />
          <p className="text-xxs text-text-tertiary">
            The server also has to serve these hostnames —{' '}
            <code className="text-accent">
              connect-tenant-domain.sh {assigned.custom_domain}
              {assigned.admin_subdomain ? ` --admin ${assigned.admin_subdomain}` : ''}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}

export default function DomainSection({
  domain,
  onChanged,
}: {
  domain: DomainState;
  onChanged: () => void;
}) {
  const connected = Boolean(domain.custom_domain);
  const [mode, setMode] = useState<'apex' | 'subdomain'>(domain.mode ?? 'apex');
  const [host, setHost] = useState(domain.custom_domain ?? '');
  const [appSub, setAppSub] = useState(domain.app_subdomain ?? 'app');
  const [wantAdmin, setWantAdmin] = useState(Boolean(domain.admin_subdomain));
  const [adminSub, setAdminSub] = useState(domain.admin_subdomain ?? 'admin');
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  // The form seeds itself from props, and useState only reads its initial value
  // once — so after connecting, the parent refetched and this component still
  // showed the empty form it mounted with. Re-sync whenever the saved domain
  // changes; local edits before connecting are untouched because the dependency
  // only moves when the server-side value does.
  useEffect(() => {
    setHost(domain.custom_domain ?? '');
    setMode(domain.mode ?? 'apex');
    setAppSub(domain.app_subdomain ?? 'app');
    setWantAdmin(Boolean(domain.admin_subdomain));
    setAdminSub(domain.admin_subdomain ?? 'admin');
  }, [domain.custom_domain, domain.mode, domain.app_subdomain, domain.admin_subdomain]);

  const status = domain.status ? STATUS_COPY[domain.status] : null;

  const connect = async () => {
    if (!host.trim()) return toast.error('Enter your domain first');
    setBusy(true);
    try {
      await adminApi.post('/branding/domain', {
        domain: host.trim(),
        app_subdomain: mode === 'subdomain' ? appSub.trim() : null,
        admin_subdomain: wantAdmin ? adminSub.trim() : null,
      });
      toast.success('Domain connected — now add the DNS records');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not connect the domain');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const res = await adminApi.post<DomainState>('/branding/domain/verify');
      if (res.status === 'DNS_VERIFIED') toast.success('DNS verified');
      else if (res.status === 'READY') toast.success('Site is live — status unchanged');
      else toast.error('DNS does not point here yet');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  /**
   * The last step of connecting a domain — telling the platform we are actually
   * serving it — was API-only, so an operator who had run
   * connect-tenant-domain.sh had no way to finish from here and the domain sat
   * short of READY. Below READY `find_by_domain` does not match it, so the
   * tenant's branding API answers nulls and their logo and favicon disappear
   * while the site otherwise works. This is also the way back if a domain ever
   * loses READY.
   */
  const markLive = async () => {
    setBusy(true);
    try {
      await adminApi.post<DomainState>('/branding/domain/provisioned', { ok: true });
      toast.success('Marked live — branding is now served on this domain');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not mark live');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await adminApi.delete('/branding/domain');
      toast.success('Domain disconnected');
      setConfirmOff(false);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not disconnect');
    } finally {
      setBusy(false);
    }
  };

  if (!domain.platform_ip) {
    return (
      <p className="text-xxs text-text-tertiary">
        The platform has not published an IP address for custom domains yet. Ask
        the platform owner to set <code className="text-accent">PLATFORM_PUBLIC_IP</code>.
      </p>
    );
  }

  // `connected` wins: a super-admin who connected a domain before the guard
  // existed still needs the disconnect button, so don't strand that row behind
  // a picker. Absent flag ⇒ true, so a stale response keeps the old form.
  if (domain.connectable === false && !connected) {
    return <AssignToTenant onChanged={onChanged} />;
  }

  return (
    <div className="space-y-4">
      {/* ── mode ── */}
      <div>
        <span className="block text-xxs uppercase tracking-wide text-text-tertiary mb-1.5">
          Hosting mode
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['apex', 'subdomain'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={connected}
              onClick={() => setMode(m)}
              className={cn(
                'text-left p-3 rounded-md border transition-fast disabled:opacity-60 disabled:cursor-not-allowed',
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
                  ? 'We serve your trading portal on broker.com and www.broker.com. Visitors landing on the root go straight to login.'
                  : 'We serve only app.broker.com. You keep the apex for your own marketing site.'}
              </span>
            </button>
          ))}
        </div>
        {connected && (
          <p className="text-xxs text-text-tertiary mt-1.5">
            Mode is locked while a domain is connected. Disconnect to switch.
          </p>
        )}
      </div>

      {/* ── domain ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xxs text-text-tertiary mb-1">Your domain</span>
          <input
            value={host}
            disabled={connected}
            onChange={(e) => setHost(e.target.value)}
            placeholder="broker.com"
            className={cn(inputCls, connected && 'opacity-60')}
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
              disabled={connected}
              onChange={(e) => setAppSub(e.target.value)}
              placeholder="app"
              className={cn(inputCls, connected && 'opacity-60')}
            />
            <span className="block text-xxs text-text-tertiary mt-1">
              Serves at {appSub || 'app'}.{host || 'broker.com'}
            </span>
          </label>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={wantAdmin}
            disabled={connected}
            onChange={(e) => setWantAdmin(e.target.checked)}
          />
          Also host the admin panel on this domain
        </label>
        {wantAdmin && (
          <div className="mt-2 max-w-xs">
            <input
              value={adminSub}
              disabled={connected}
              onChange={(e) => setAdminSub(e.target.value)}
              placeholder="admin"
              className={cn(inputCls, connected && 'opacity-60')}
            />
            <span className="block text-xxs text-text-tertiary mt-1">
              Your team signs in at {adminSub || 'admin'}.{host || 'broker.com'} instead of
              the platform admin URL.
            </span>
          </div>
        )}
      </div>

      {!connected ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connect()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
          Connect domain
        </button>
      ) : (
        <>
          {/* ── DNS records ── */}
          <div>
            <span className="block text-xxs uppercase tracking-wide text-text-tertiary mb-1.5">
              DNS records — add these at your domain registrar
            </span>
            <div className="border border-border-primary rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-tertiary border-b border-border-primary">
                    <th className="text-left font-medium px-3 py-2 w-16">Type</th>
                    <th className="text-left font-medium px-3 py-2 w-32">Host</th>
                    <th className="text-left font-medium px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.dns_records.map((r) => (
                    <tr key={`${r.type}-${r.host}`} className="border-b border-border-primary last:border-0">
                      <td className="px-3 py-2 font-mono text-text-secondary">{r.type}</td>
                      <td className="px-3 py-2 font-mono text-text-primary">{r.host}</td>
                      <td className="px-3 py-2">
                        <CopyField value={r.value} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xxs text-text-tertiary mt-1.5">
              A low TTL (300 seconds) makes the first verification faster.
            </p>
          </div>

          {/* ── status ── */}
          {status && (
            <div
              className={cn(
                'rounded-md border p-3',
                status.tone === 'ok'
                  ? 'border-buy/40 bg-buy/5'
                  : status.tone === 'bad'
                    ? 'border-sell/40 bg-sell/5'
                    : 'border-border-primary bg-bg-tertiary',
              )}
            >
              <div className="flex items-center gap-2">
                {status.tone === 'ok' ? (
                  <CheckCircle2 size={14} className="text-buy" />
                ) : status.tone === 'bad' ? (
                  <AlertTriangle size={14} className="text-sell" />
                ) : (
                  <Loader2 size={14} className="text-text-tertiary" />
                )}
                <span className="text-xs font-medium text-text-primary">{status.label}</span>
                {domain.provisioned_at && (
                  <span className="text-xxs text-text-tertiary">
                    since {new Date(domain.provisioned_at).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xxs text-text-secondary mt-1 leading-relaxed">{status.hint}</p>
              {domain.last_error && (
                <p className="text-xxs text-sell mt-1.5 break-words">{domain.last_error}</p>
              )}

              {domain.status === 'READY' && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {domain.app_url && (
                    <a
                      href={domain.app_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      {domain.app_url}
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {domain.admin_url && (
                    <a
                      href={domain.admin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      {domain.admin_url}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void verify()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Verify DNS
            </button>

            {/* Shown until the domain is live. Behind Cloudflare "Verify DNS"
                can never pass — proxied records resolve to Cloudflare, not to
                us — so without this the domain could not reach READY from the
                UI at all, and the tenant's branding stayed switched off. */}
            {domain.status !== 'READY' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void markLive()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border text-fg disabled:opacity-50"
                title="Use once the server is serving this domain (connect-tenant-domain.sh has been run)"
              >
                Mark as live
              </button>
            )}

            {confirmOff ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void disconnect()}
                  className="px-3 py-1.5 text-xs rounded-md bg-sell text-white disabled:opacity-50"
                >
                  Confirm disconnect
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOff(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOff(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-sell/40 text-sell"
              >
                <Unplug size={13} />
                Disconnect
              </button>
            )}
          </div>
          {confirmOff && (
            <p className="text-xxs text-text-tertiary">
              Your clients will go back to signing in on the platform hostname. Your
              branding and pool are untouched.
            </p>
          )}
        </>
      )}
    </div>
  );
}
