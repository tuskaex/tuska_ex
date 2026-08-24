'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  Loader2, ArrowLeft, Save, Ban, CheckCircle2, KeyRound, Trash2, LogIn,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  PaginatedResponse, SubAdmin, SubAdminClient, SubAdminReport, TenantBranding,
} from '@/types';
import { PERMISSION_GROUPS, groupChecked, toggleGroup, isGrantable } from '../permissions';

export default function SubAdminDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [sub, setSub] = useState<SubAdmin | null>(null);
  const [report, setReport] = useState<SubAdminReport | null>(null);
  const [clients, setClients] = useState<SubAdminClient[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [appSub, setAppSub] = useState('');
  const [adminSub, setAdminSub] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // null until loaded, and stays null when BRANDING_ENABLED is off — the
  // endpoint 503s then, which is a configuration state, not an error worth a
  // toast on every page load.
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [brandName, setBrandName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportWa, setSupportWa] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, rep, cl] = await Promise.all([
        adminApi.get<SubAdmin>(`/sub-admins/${id}`),
        adminApi.get<SubAdminReport>(`/sub-admins/${id}/report`),
        adminApi.get<PaginatedResponse<SubAdminClient>>(`/sub-admins/${id}/users`, {
          page: '1',
          per_page: '50',
        }),
      ]);
      setSub(s);
      setReport(rep);
      setClients(cl.items || []);
      setChecked(s.permissions || []);
      // Show what this tenant already holds instead of a blank form — an empty
      // field next to a live domain reads as "not assigned". Runs on mount and
      // after each completed action, never while the operator is typing.
      setDomain(s.domain?.custom_domain || '');
      setAppSub(s.domain?.app_subdomain || '');
      setAdminSub(s.domain?.admin_subdomain ?? 'admin');

      // Separate request, and deliberately not in the Promise.all above: a 503
      // from BRANDING_ENABLED=false would reject the whole batch and blank the
      // page. Branding being off must not stop the rest of the screen loading.
      try {
        const b = await adminApi.get<TenantBranding>(`/sub-admins/${id}/branding`);
        setBranding(b);
        setBrandName(b.brand_name || '');
        setSupportEmail(b.support_email || '');
        setSupportWa(b.support_whatsapp || '');
      } catch {
        setBranding(null);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sub-admin');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      void fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async () => {
    try {
      const res = await adminApi.post<{ access_token: string }>(
        `/sub-admins/${id}/impersonate`,
      );
      toast.success(`Acting as ${sub?.email ?? 'sub-admin'}`);
      if (typeof window !== 'undefined') {
        // Same handoff as the Employees screen: swap the bearer token, drop the
        // cached admin profile so the shell re-reads /auth/me under the new
        // identity, then hard-navigate. A router.push would keep the old
        // client-side auth state and the sidebar would show the wrong menu.
        adminApi.setToken(res.access_token);
        useAuthStore.setState({ isAuthenticated: true, admin: null });
        setTimeout(() => window.location.replace('/dashboard'), 400);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not impersonate');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={18} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="p-6 text-xs text-text-tertiary">
        Sub-admin not found.{' '}
        <Link href="/sub-admins" className="text-accent hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/sub-admins"
            className="p-1.5 rounded-md border border-border-primary text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              {sub.full_name || sub.email}
            </h1>
            <p className="text-xxs text-text-tertiary">{sub.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void impersonate()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            <LogIn size={13} />
            Act as
          </button>
          {sub.status === 'active' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => adminApi.post(`/sub-admins/${id}/block`), 'Blocked')
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-sell/40 text-sell disabled:opacity-50"
            >
              <Ban size={13} />
              Block
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() => adminApi.post(`/sub-admins/${id}/unblock`), 'Unblocked')
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-buy/40 text-buy disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              Unblock
            </button>
          )}
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Clients" value={String(report.client_count)} />
          <Stat label="Accounts" value={String(report.account_count)} />
          <Stat label="Total balance" value={`$${report.total_balance.toFixed(2)}`} />
          <Stat label="Total equity" value={`$${report.total_equity.toFixed(2)}`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Permissions">
          {/* One row per sidebar section the sub-admin will see, not the raw
              dotted strings. Those made the operator work out which of
              `deposits.view`, `deposits.approve` and `deposits.reject` adds up
              to "can handle deposits", and half-ticking a set produced an admin
              whose menu entry worked until they pressed a button. Same groups
              the create form uses, so granting and editing read alike. */}
          <p className="text-xxs text-text-tertiary mb-2">
            Tick the sections this sub-admin should see. White-label is always
            available — every tenant manages their own brand.
          </p>
          <div className="border border-border-primary rounded-md max-h-64 overflow-y-auto p-2 space-y-1">
            {PERMISSION_GROUPS.filter((g) => !g.sensitive).map((g) => (
              <label
                key={g.key}
                title={!isGrantable(g) ? g.unavailableReason : undefined}
                className={`flex items-start gap-2 text-xs py-1 ${
                  isGrantable(g)
                    ? 'text-text-secondary cursor-pointer'
                    : 'text-text-tertiary cursor-not-allowed opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={!isGrantable(g)}
                  checked={groupChecked(g, checked)}
                  onChange={() => setChecked((c) => toggleGroup(g, c))}
                />
                <span>
                  {g.label}
                  {(isGrantable(g) ? g.hint : g.unavailableReason) && (
                    <span className="block text-xxs text-text-tertiary">
                      {isGrantable(g) ? g.hint : g.unavailableReason}
                    </span>
                  )}
                </span>
              </label>
            ))}

            <p className="text-xxs text-text-tertiary pt-2 mt-1 border-t border-border-primary">
              Moves money or changes a client account
            </p>
            {PERMISSION_GROUPS.filter((g) => g.sensitive).map((g) => (
              <label
                key={g.key}
                title={!isGrantable(g) ? g.unavailableReason : undefined}
                className={`flex items-start gap-2 text-xs py-1 ${
                  isGrantable(g)
                    ? 'text-text-secondary cursor-pointer'
                    : 'text-text-tertiary cursor-not-allowed opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  disabled={!isGrantable(g)}
                  checked={groupChecked(g, checked)}
                  onChange={() => setChecked((c) => toggleGroup(g, c))}
                />
                <span>
                  {g.label}
                  {(isGrantable(g) ? g.hint : g.unavailableReason) && (
                    <span className="block text-xxs text-text-tertiary">
                      {isGrantable(g) ? g.hint : g.unavailableReason}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                () => adminApi.put(`/sub-admins/${id}/permissions`, { permissions: checked }),
                'Permissions saved',
              )
            }
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
          >
            <Save size={13} />
            Save permissions
          </button>
        </Panel>

        <div className="space-y-4">
          {/* Attaching a domain used to be possible only from the tenant's own
              White-label page, because /admin/branding/domain acts on the
              caller's row. So a super-admin had to hand over a login — and a
              domain left on the super-admin's own row sends every signup to the
              platform pool while rendering the tenant's brand perfectly, which
              is indistinguishable from a broken feature. */}
          <Panel title="White-label domain">
            <p className="text-xxs text-text-tertiary mb-2">
              Points the domain at this sub-admin and marks it live. Moves it off
              whoever holds it now, including your own account.
            </p>
            <div className="space-y-2">
              <input
                value={domain}
                placeholder="broker.com"
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
              />
              <div className="flex items-center gap-2">
                <input
                  value={appSub}
                  placeholder="app subdomain (blank = apex)"
                  onChange={(e) => setAppSub(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
                />
                <input
                  value={adminSub}
                  placeholder="admin"
                  onChange={(e) => setAdminSub(e.target.value)}
                  className="w-24 px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
                />
              </div>
              <button
                type="button"
                disabled={busy || domain.trim().length < 3}
                onClick={() =>
                  void run(async () => {
                    await adminApi.post(`/sub-admins/${id}/domain`, {
                      domain: domain.trim(),
                      app_subdomain: appSub.trim() || null,
                      admin_subdomain: adminSub.trim() || null,
                    });
                  }, 'Domain assigned and marked live')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
              >
                <Save size={13} />
                Assign domain
              </button>
              <p className="text-xxs text-text-tertiary">
                The server must already serve these hostnames —
                connect-tenant-domain.sh. &quot;Verify DNS&quot; cannot confirm a
                Cloudflare-proxied record, which is why this marks live directly.
              </p>

              {/* The A records. connect_domain returns these to a tenant
                  connecting their own domain, but it refuses a super-admin and
                  points them here — where assign_domain returned only the DTO
                  and nothing rendered them. So assigning a domain as the
                  platform owner silently lost the one output the operator
                  actually needs to hand the tenant. */}
              {sub.domain?.custom_domain && (
                <div className="pt-2 mt-1 border-t border-border-primary space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xxs text-text-secondary">
                      DNS records for{' '}
                      <span className="text-text-primary">{sub.domain.custom_domain}</span>
                    </span>
                    <span className="text-xxs text-text-tertiary">
                      {sub.domain.mode} · {sub.domain.status}
                    </span>
                  </div>

                  {sub.domain.platform_ip ? (
                    <table className="w-full text-xxs">
                      <thead className="text-text-tertiary">
                        <tr>
                          <th className="text-left font-normal pb-1">Type</th>
                          <th className="text-left font-normal pb-1">Host</th>
                          <th className="text-left font-normal pb-1">Value</th>
                        </tr>
                      </thead>
                      <tbody className="text-text-primary font-mono">
                        {sub.domain.dns_records.map((r) => (
                          <tr key={`${r.type}-${r.host}`}>
                            <td className="py-0.5 pr-2">{r.type}</td>
                            <td className="py-0.5 pr-2">{r.host}</td>
                            <td className="py-0.5">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xxs text-danger">
                      PLATFORM_PUBLIC_IP is not set, so no A records can be
                      produced. Set it in .env and restart admin-api.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        sub.domain.dns_records
                          .map((r) => `${r.type}\t${r.host}\t${r.value}`)
                          .join('\n'),
                      );
                      toast.success('DNS records copied');
                    }}
                    className="px-2.5 py-1 text-xxs rounded-md border border-border-primary text-text-secondary"
                  >
                    Copy records
                  </button>

                  <p className="text-xxs text-text-tertiary">
                    Serving:{' '}
                    <span className="font-mono text-text-secondary">
                      {sub.domain.served_hostnames.join(', ')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </Panel>

          {/* The tenant cannot reach /branding any more — assert_may_manage_branding
              is super_admin-only — so this is where their brand gets set. Before
              it existed the only logo control a super-admin could see was their
              own, and a tenant's logo went onto the platform row, where it
              renders for the platform and not for them. */}
          <Panel title="Branding">
            {branding ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  {branding.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={branding.logo_url}
                      alt=""
                      className="h-10 w-auto max-w-[120px] object-contain rounded bg-bg-tertiary p-1"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded bg-bg-tertiary flex items-center justify-center text-xxs text-text-tertiary">
                      none
                    </span>
                  )}
                  <label className="px-2.5 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary cursor-pointer hover:border-border-secondary">
                    {branding.logo_url ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        void run(async () => {
                          const fd = new FormData();
                          fd.append('file', f);
                          await adminApi.postForm(`/sub-admins/${id}/branding/logo`, fd);
                        }, 'Logo updated');
                      }}
                    />
                  </label>
                </div>
                <p className="text-xxs text-text-tertiary">PNG, JPG or WebP. Up to 2 MB.</p>

                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Brand name — shown to their clients"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="Support email"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
                  />
                  <input
                    value={supportWa}
                    onChange={(e) => setSupportWa(e.target.value)}
                    placeholder="+91…"
                    className="w-28 px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await adminApi.put(`/sub-admins/${id}/branding`, {
                        brand_name: brandName,
                        support_email: supportEmail,
                        support_whatsapp: supportWa,
                      });
                    }, 'Branding saved')
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
                >
                  <Save size={13} />
                  Save branding
                </button>

                <p
                  className={cn(
                    'text-xxs pt-1',
                    branding.smtp_configured ? 'text-text-tertiary' : 'text-warning',
                  )}
                >
                  {branding.smtp_configured
                    ? `Outbound email: ${branding.smtp_from}`
                    : 'No SMTP set — their clients currently receive no email at all.'}
                </p>
              </div>
            ) : (
              <p className="text-xxs text-text-tertiary">
                Branding is switched off on this platform (BRANDING_ENABLED).
              </p>
            )}
          </Panel>

          <Panel title="Reset password">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={newPassword}
                placeholder="New password (min 8)"
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary"
              />
              <button
                type="button"
                disabled={busy || newPassword.length < 8}
                onClick={() =>
                  void run(async () => {
                    await adminApi.post(`/sub-admins/${id}/reset-password`, {
                      new_password: newPassword,
                    });
                    setNewPassword('');
                  }, 'Password reset')
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary disabled:opacity-50"
              >
                <KeyRound size={13} />
                Reset
              </button>
            </div>
          </Panel>

          <Panel title="Retire tenant">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xxs text-text-tertiary">
                  This returns the tenant&apos;s {sub.user_count} client
                  {sub.user_count === 1 ? '' : 's'} to the platform pool and disables
                  the account. The clients are not deleted, and the tenant&apos;s row is
                  kept so its audit history stays intact.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await adminApi.delete(`/sub-admins/${id}`);
                        router.push('/sub-admins');
                      }, 'Sub-admin deactivated')
                    }
                    className="px-3 py-1.5 text-xs rounded-md bg-sell text-white disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-sell/40 text-sell"
              >
                <Trash2 size={13} />
                Deactivate sub-admin
              </button>
            )}
          </Panel>
        </div>
      </div>

      <Panel title={`Assigned clients (${report?.client_count ?? clients.length})`}>
        {clients.length === 0 ? (
          <p className="text-xs text-text-tertiary py-4">
            No clients in this pool yet. Assign them from the Users screen.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-primary text-text-tertiary">
                  <th className="text-left font-medium px-3 py-2">Email</th>
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">KYC</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-border-primary last:border-0">
                    <td className="px-3 py-2 text-text-secondary">{c.email}</td>
                    <td className="px-3 py-2 text-text-primary">{c.full_name || '—'}</td>
                    <td className="px-3 py-2 text-text-secondary">{c.status}</td>
                    <td className="px-3 py-2 text-text-secondary">{c.kyc_status}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              adminApi.post(`/sub-admins/assign/${c.id}`, {
                                sub_admin_id: null,
                              }),
                            'Returned to platform pool',
                          )
                        }
                        className="text-text-tertiary hover:text-sell"
                      >
                        Unassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-secondary border border-border-primary rounded-md px-3 py-2">
      <p className="text-xxs text-text-tertiary">{label}</p>
      <p className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-bg-secondary border border-border-primary rounded-md')}>
      <div className="px-3 py-2 border-b border-border-primary">
        <h2 className="text-xs font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
