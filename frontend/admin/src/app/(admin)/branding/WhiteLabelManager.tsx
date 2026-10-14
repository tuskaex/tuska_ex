'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Upload, Trash2, Save, X, ExternalLink, Ban, CheckCircle2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { adminMediaSrc } from '@/lib/mediaSrc';
import { cn } from '@/lib/utils';
import type { SubAdmin, SubAdminReport, TenantBranding } from '@/types';
import BrandColorPicker, { DEFAULT_BRAND_COLOR, isValidHex } from '../sub-admins/BrandColorPicker';
import { PERMISSION_GROUPS, groupChecked, isGrantable, toggleGroup } from '../sub-admins/permissions';

// Keep in step with CLIENT_FEATURES in sub_admin_service.py and gateway api/brokers.py.
const CLIENT_FEATURES: [string, string][] = [
  ['deposits', 'Deposits'],
  ['withdrawals', 'Withdrawals'],
  ['transfers', 'Transfers to trading accounts'],
  ['copy_trading', 'Copy trading & PAMM'],
  ['ib_program', 'Partner program (IB)'],
];

const inputCls =
  'w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-tertiary';

function label(t: SubAdmin): string {
  return t.brand_name || t.full_name || t.email;
}

/** Every white-labelled broker in one table, each fully editable in place. */
export default function WhiteLabelManager({
  tenants,
  onChanged,
}: {
  tenants: SubAdmin[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<SubAdmin | null>(null);

  return (
    <section className="bg-bg-secondary border border-accent/40 rounded-md">
      <div className="px-4 py-3 border-b border-border-primary">
        <h2 className="text-sm font-semibold text-text-primary">White-label brokers</h2>
        <p className="text-xxs text-text-tertiary mt-0.5">
          Every white-labelled sub-broker. Edit their logo, name, colours, support details,
          domain, permissions and client features from here.
        </p>
      </div>

      {tenants.length === 0 ? (
        <p className="px-4 py-6 text-xs text-text-tertiary">
          No sub-brokers yet. Create one under{' '}
          <Link href="/sub-admins" className="text-accent hover:underline">Sub-brokers</Link>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-xxs uppercase tracking-wide text-text-tertiary border-b border-border-primary">
                <th className="px-4 py-2 font-medium">Broker</th>
                <th className="px-3 py-2 font-medium">Domain</th>
                <th className="px-3 py-2 font-medium">Colours</th>
                <th className="px-3 py-2 font-medium text-right">Clients</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {tenants.map((t) => {
                const logo = adminMediaSrc(t.logo_url);
                const live = t.domain?.status === 'READY';
                return (
                  <tr key={t.id} className="hover:bg-bg-hover">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-14 shrink-0 rounded border border-border-primary bg-bg-tertiary flex items-center justify-center overflow-hidden">
                          {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-text-tertiary">No logo</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{label(t)}</p>
                          <p className="text-xxs text-text-tertiary truncate">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {t.domain?.custom_domain ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-success' : 'bg-warning')} />
                          <span className="text-text-secondary">{t.domain.custom_domain}</span>
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5" title="User panel / admin panel">
                        <span className="h-3.5 w-3.5 rounded-full border border-border-primary" style={{ backgroundColor: t.brand_color || DEFAULT_BRAND_COLOR }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-border-primary" style={{ backgroundColor: t.admin_color || t.brand_color || DEFAULT_BRAND_COLOR }} />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-secondary">{t.user_count}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn('text-xxs font-medium uppercase', t.status === 'active' ? 'text-success' : 'text-sell')}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditBroker
          key={editing.id}
          tenant={editing}
          onClose={() => setEditing(null)}
          onChanged={onChanged}
        />
      )}
    </section>
  );
}

type Tab = 'overview' | 'branding' | 'domain' | 'access' | 'account';

function EditBroker({
  tenant,
  onClose,
  onChanged,
}: {
  tenant: SubAdmin;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [loaded, setLoaded] = useState(false);
  const [report, setReport] = useState<SubAdminReport | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Branding
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [brandName, setBrandName] = useState(tenant.brand_name || '');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportWa, setSupportWa] = useState('');
  const [brandColor, setBrandColor] = useState(tenant.brand_color || DEFAULT_BRAND_COLOR);
  const [adminColor, setAdminColor] = useState(tenant.admin_color || tenant.brand_color || DEFAULT_BRAND_COLOR);
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logo_url || null);

  // Domain
  const [domain, setDomain] = useState(tenant.domain?.custom_domain || '');
  const [appSub, setAppSub] = useState(tenant.domain?.app_subdomain || '');
  const [adminSub, setAdminSub] = useState(tenant.domain?.admin_subdomain ?? 'admin');
  const [domainInfo, setDomainInfo] = useState(tenant.domain);

  // Access
  const [perms, setPerms] = useState<string[]>(tenant.permissions || []);
  const [features, setFeatures] = useState<Record<string, boolean>>(tenant.client_features || {});

  const [fresh, setFresh] = useState<SubAdmin>(tenant);

  // Account
  const [firstName, setFirstName] = useState(tenant.first_name || '');
  const [lastName, setLastName] = useState(tenant.last_name || '');
  const [phone, setPhone] = useState(tenant.phone || '');
  const [status, setStatus] = useState(tenant.status);

  // Everything is re-read from the server for THIS broker when the window
  // opens, so nothing from the list snapshot or a previously opened broker
  // can show up here.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [s, b, r] = await Promise.allSettled([
        adminApi.get<SubAdmin>(`/sub-admins/${tenant.id}`),
        adminApi.get<TenantBranding>(`/sub-admins/${tenant.id}/branding`),
        adminApi.get<SubAdminReport>(`/sub-admins/${tenant.id}/report`),
      ]);
      if (cancelled) return;
      if (s.status === 'fulfilled') {
        const t = s.value;
        setDomain(t.domain?.custom_domain || '');
        setAppSub(t.domain?.app_subdomain || '');
        setAdminSub(t.domain?.admin_subdomain ?? 'admin');
        setDomainInfo(t.domain);
        setPerms(t.permissions || []);
        setFeatures(t.client_features || {});
        setFirstName(t.first_name || '');
        setLastName(t.last_name || '');
        setPhone(t.phone || '');
        setStatus(t.status);
        setFresh(t);
      } else {
        toast.error('Could not load this broker');
      }
      if (b.status === 'fulfilled') {
        const v = b.value;
        setBranding(v);
        setBrandName(v.brand_name || '');
        setSupportEmail(v.support_email || '');
        setSupportWa(v.support_whatsapp || '');
        setBrandColor(v.brand_color || DEFAULT_BRAND_COLOR);
        setAdminColor(v.admin_color || v.brand_color || DEFAULT_BRAND_COLOR);
        setLogoUrl(v.logo_url || null);
      }
      if (r.status === 'fulfilled') setReport(r.value);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [tenant.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const saveBranding = () =>
    run(async () => {
      if (brandColor.trim() && !isValidHex(brandColor)) throw new Error('User panel colour must be a hex colour such as #2563EB');
      if (adminColor.trim() && !isValidHex(adminColor)) throw new Error('Admin panel colour must be a hex colour such as #2563EB');
      await adminApi.put(`/sub-admins/${tenant.id}/branding`, {
        brand_name: brandName,
        support_email: supportEmail,
        support_whatsapp: supportWa,
        brand_color: brandColor.trim(),
        admin_color: adminColor.trim(),
      });
    }, 'Branding saved');

  const uploadLogo = (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast.error('Logo must be a PNG, JPG or WebP image');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be 2 MB or smaller');
    void run(async () => {
      const fd = new FormData();
      fd.append('file', file);
      const out = await adminApi.postForm<TenantBranding>(`/sub-admins/${tenant.id}/branding/logo`, fd);
      setLogoUrl(out.logo_url || null);
    }, 'Logo saved');
  };

  const removeLogo = () =>
    run(async () => {
      await adminApi.delete(`/sub-admins/${tenant.id}/branding/logo`);
      setLogoUrl(null);
    }, 'Logo removed');

  const saveDomain = () =>
    run(async () => {
      if (!domain.trim()) throw new Error('Enter a domain such as broker.com');
      const out = await adminApi.post<SubAdmin>(`/sub-admins/${tenant.id}/domain`, {
        domain: domain.trim(),
        app_subdomain: appSub.trim() || null,
        admin_subdomain: adminSub.trim() || null,
      });
      if (out?.domain) setDomainInfo(out.domain);
    }, 'Domain connected');

  const disconnectDomain = () =>
    run(async () => {
      const out = await adminApi.delete<SubAdmin['domain']>(`/sub-admins/${tenant.id}/domain`);
      setDomainInfo(out);
      setDomain('');
      setAppSub('');
    }, 'Domain disconnected');

  const saveAccess = () =>
    run(async () => {
      await adminApi.put(`/sub-admins/${tenant.id}/permissions`, { permissions: perms });
      await adminApi.put(`/sub-admins/${tenant.id}/client-features`, {
        features: Object.fromEntries(CLIENT_FEATURES.map(([k]) => [k, features[k] !== false])),
      });
    }, 'Access saved');

  const saveAccount = () =>
    run(async () => {
      await adminApi.put(`/sub-admins/${tenant.id}`, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      });
    }, 'Account saved');

  const toggleStatus = () =>
    run(async () => {
      const blocking = status === 'active';
      await adminApi.post(`/sub-admins/${tenant.id}/${blocking ? 'block' : 'unblock'}`);
      setStatus(blocking ? 'blocked' : 'active');
    }, status === 'active' ? 'Blocked' : 'Unblocked');

  const tabs: [Tab, string][] = [
    ['overview', 'Overview'],
    ['branding', 'Branding'],
    ['domain', 'Domain'],
    ['access', 'Access'],
    ['account', 'Account'],
  ];
  const logo = adminMediaSrc(logoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-10" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-border-primary bg-bg-secondary shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">Edit {label(tenant)}</h3>
            <p className="text-xxs text-text-tertiary truncate">{tenant.email} · {tenant.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/sub-admins/${tenant.id}`} className="inline-flex items-center gap-1 text-xxs text-text-secondary hover:text-text-primary">
              Full profile <ExternalLink size={11} />
            </Link>
            <button type="button" onClick={onClose} className="p-1 text-text-tertiary hover:text-text-primary" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-border-primary">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                'px-3 py-1.5 text-xs -mb-px border-b-2',
                tab === k ? 'border-accent text-text-primary font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary',
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {!loaded && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-text-tertiary" />
            </div>
          )}

          {loaded && tab === 'overview' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
              <Detail label="Brand name" value={brandName || '—'} />
              <Detail label="Broker code" value={fresh.code || '—'} mono />
              <Detail label="Contact name" value={[firstName, lastName].filter(Boolean).join(' ') || '—'} />
              <Detail label="Login email" value={fresh.email} />
              <Detail label="Mobile" value={phone || '—'} />
              <Detail label="Status" value={status} />
              <Detail label="Created" value={fresh.created_at ? new Date(fresh.created_at).toLocaleString() : '—'} />
              <Detail label="Clients" value={String(report?.client_count ?? fresh.user_count)} />
              {report && <Detail label="Trading accounts" value={String(report.account_count)} />}
              {report && (
                <Detail
                  label="Clients' total balance"
                  value={`$${Number(report.total_balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                />
              )}
              <Detail
                label="Domain"
                value={domainInfo?.custom_domain ? `${domainInfo.custom_domain} (${domainInfo.status || 'not live'})` : 'Not connected'}
              />
              <Detail label="User panel URL" value={domainInfo?.app_url || '—'} />
              <Detail label="Admin panel URL" value={domainInfo?.admin_url || '—'} />
              <Detail label="Referral link" value={branding?.referral_link || '—'} mono />
              <Detail label="Support email" value={supportEmail || '—'} />
              <Detail label="Support WhatsApp" value={supportWa || '—'} />
              <Detail
                label="Outbound email"
                value={branding?.smtp_configured ? `Own account (${branding.smtp_from})` : 'Platform account, sent in their name'}
              />
              <div>
                <dt className="text-xxs text-text-tertiary">Colours (user / admin)</dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full border border-border-primary" style={{ backgroundColor: brandColor || DEFAULT_BRAND_COLOR }} />
                  <span className="font-mono text-text-secondary">{brandColor || DEFAULT_BRAND_COLOR}</span>
                  <span className="h-4 w-4 rounded-full border border-border-primary ml-2" style={{ backgroundColor: adminColor || DEFAULT_BRAND_COLOR }} />
                  <span className="font-mono text-text-secondary">{adminColor || DEFAULT_BRAND_COLOR}</span>
                </dd>
              </div>
              <Detail
                label="Admin sections granted"
                value={PERMISSION_GROUPS.filter((g) => isGrantable(g) && groupChecked(g, perms)).map((g) => g.label).join(', ') || 'None'}
              />
              <Detail
                label="Client features on"
                value={CLIENT_FEATURES.filter(([k]) => features[k] !== false).map(([, l]) => l).join(', ') || 'None'}
              />
            </dl>
          )}

          {loaded && tab === 'branding' && (
            <>
              <div className="flex items-center gap-4">
                <div className="w-28 h-14 rounded-md border border-border-primary bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-xxs text-text-tertiary">No logo</span>
                  )}
                </div>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }}
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary hover:text-text-primary disabled:opacity-50">
                      <Upload size={13} /> {logo ? 'Replace logo' : 'Upload logo'}
                    </button>
                    {logo && (
                      <button type="button" disabled={busy} onClick={() => void removeLogo()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary hover:text-text-primary disabled:opacity-50">
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xxs text-text-tertiary mt-1">PNG, JPG or WebP. Up to 2 MB. Shown on both panels and the browser tab.</p>
                </div>
              </div>

              <Field label="Brand name (shown instead of TradesX)">
                <input value={brandName} maxLength={80} onChange={(e) => setBrandName(e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Support email">
                  <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Support WhatsApp">
                  <input value={supportWa} onChange={(e) => setSupportWa(e.target.value)} placeholder="+91…" className={inputCls} />
                </Field>
              </div>
              <Field label="User panel colour — buttons, links and highlights their clients see">
                <BrandColorPicker value={brandColor} onChange={setBrandColor} />
              </Field>
              <Field label="Admin panel colour — their own admin panel">
                <BrandColorPicker value={adminColor} onChange={setAdminColor} />
              </Field>
              <SaveButton busy={busy || !branding} onClick={() => void saveBranding()} text="Save branding" />
            </>
          )}

          {loaded && tab === 'domain' && (
            <>
              <Field label="Domain (apex, e.g. broker.com)">
                <input value={domain} onChange={(e) => setDomain(e.target.value.trim().toLowerCase())} placeholder="broker.com" className={inputCls} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="App subdomain (blank = site on the domain itself)">
                  <input value={appSub} onChange={(e) => setAppSub(e.target.value.trim().toLowerCase())} placeholder="e.g. app" className={inputCls} />
                </Field>
                <Field label="Admin panel subdomain">
                  <input value={adminSub} onChange={(e) => setAdminSub(e.target.value.trim().toLowerCase())} placeholder="admin" className={inputCls} />
                </Field>
              </div>
              {domainInfo?.custom_domain && (
                <div className="rounded-md border border-border-primary bg-bg-tertiary p-3 text-xxs text-text-secondary space-y-1">
                  <p className="flex items-center gap-1.5 text-text-primary font-medium">
                    <Globe size={12} /> {domainInfo.custom_domain}
                    <span className={cn('ml-1 uppercase', domainInfo.status === 'READY' ? 'text-success' : 'text-warning')}>
                      {domainInfo.status || 'not live'}
                    </span>
                  </p>
                  {domainInfo.app_url && <p>User panel: {domainInfo.app_url}</p>}
                  {domainInfo.admin_url && <p>Admin panel: {domainInfo.admin_url}</p>}
                  {domainInfo.last_error ? (
                    <p className="text-warning">{domainInfo.last_error}</p>
                  ) : domainInfo.status === 'READY' ? (
                    <p className="text-success">Live — DNS, SSL and the site are set up automatically.</p>
                  ) : null}
                </div>
              )}
              {domainInfo?.custom_domain && (domainInfo.dns_records?.length ?? 0) > 0 && (
                <div className="rounded-md border border-border-primary p-3 text-xxs">
                  <p className="text-text-primary font-medium mb-1.5">
                    DNS records the broker adds at their domain provider
                  </p>
                  <table className="w-full font-mono">
                    <thead>
                      <tr className="text-text-tertiary text-left">
                        <th className="py-1 pr-3 font-normal">Type</th>
                        <th className="py-1 pr-3 font-normal">Host</th>
                        <th className="py-1 font-normal">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {domainInfo.dns_records.map((r) => (
                        <tr key={`${r.type}-${r.host}`} className="text-text-secondary">
                          <td className="py-1 pr-3">{r.type}</td>
                          <td className="py-1 pr-3">{r.host}</td>
                          <td className="py-1">{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-text-tertiary mt-1.5 font-sans">
                    Nothing else is needed: once these resolve, the site and its SSL
                    certificate go live automatically within a few minutes.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <SaveButton busy={busy} onClick={() => void saveDomain()} text={domainInfo?.custom_domain ? 'Update domain' : 'Connect domain'} />
                {domainInfo?.custom_domain && (
                  <button type="button" disabled={busy} onClick={() => void disconnectDomain()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-sell/50 text-sell disabled:opacity-50">
                    <Trash2 size={13} /> Disconnect
                  </button>
                )}
              </div>
            </>
          )}

          {loaded && tab === 'access' && (
            <>
              <div>
                <p className="text-xxs text-text-tertiary mb-1.5">Admin panel sections this broker can see (only their own clients).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PERMISSION_GROUPS.filter(isGrantable).map((g) => (
                    <label key={g.key} className="flex items-start gap-2 rounded-md border border-border-primary px-2.5 py-1.5 cursor-pointer hover:bg-bg-hover">
                      <input type="checkbox" className="mt-0.5" checked={groupChecked(g, perms)} onChange={() => setPerms((p) => toggleGroup(g, p))} />
                      <span className="min-w-0">
                        <span className={cn('block text-xs', g.sensitive ? 'text-warning' : 'text-text-primary')}>{g.label}</span>
                        {g.hint && <span className="block text-xxs text-text-tertiary">{g.hint}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xxs text-text-tertiary mb-1.5">Features their clients can use.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CLIENT_FEATURES.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 rounded-md border border-border-primary px-2.5 py-1.5 cursor-pointer hover:bg-bg-hover">
                      <input type="checkbox" checked={features[k] !== false} onChange={(e) => setFeatures((f) => ({ ...f, [k]: e.target.checked }))} />
                      <span className="text-xs text-text-primary">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <SaveButton busy={busy} onClick={() => void saveAccess()} text="Save access" />
            </>
          )}

          {loaded && tab === 'account' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="First name">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Last name">
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Mobile">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Login email">
                  <input value={tenant.email} disabled className={cn(inputCls, 'opacity-60')} />
                </Field>
              </div>
              <div className="flex items-center gap-2">
                <SaveButton busy={busy} onClick={() => void saveAccount()} text="Save account" />
                <button type="button" disabled={busy} onClick={() => void toggleStatus()}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border disabled:opacity-50',
                    status === 'active' ? 'border-sell/50 text-sell' : 'border-success/50 text-success')}>
                  {status === 'active' ? <><Ban size={13} /> Block login</> : <><CheckCircle2 size={13} /> Unblock login</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xxs text-text-tertiary">{label}</dt>
      <dd className={cn('mt-0.5 text-text-primary break-all', mono && 'font-mono text-xxs')}>{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xxs text-text-tertiary mb-1">{label}</span>
      {children}
    </label>
  );
}

function SaveButton({ busy, onClick, text }: { busy: boolean; onClick: () => void; text: string }) {
  return (
    <button type="button" disabled={busy} onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
      {text}
    </button>
  );
}
