'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { adminMediaSrc } from '@/lib/mediaSrc';
import { Loader2, Upload, Save, Mail, Send, Link2, Globe } from 'lucide-react';
import { CopyField } from './ReferralLink';
import DomainSection from './DomainSection';
import toast from 'react-hot-toast';
import type { BrandingProfile } from '@/types';

export default function BrandingPage() {
  const [profile, setProfile] = useState<BrandingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testing, setTesting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [brand, setBrand] = useState({
    brand_name: '',
    support_email: '',
    support_whatsapp: '',
  });
  const [smtp, setSmtp] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_from: '',
    smtp_password: '',
    smtp_tls: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await adminApi.get<BrandingProfile>('/branding/me');
      setProfile(p);
      setBrand({
        brand_name: p.brand_name ?? '',
        support_email: p.support_email ?? '',
        support_whatsapp: p.support_whatsapp ?? '',
      });
      setSmtp({
        smtp_host: p.smtp_host ?? '',
        smtp_port: p.smtp_port ? String(p.smtp_port) : '587',
        smtp_user: p.smtp_user ?? '',
        smtp_from: p.smtp_from ?? '',
        smtp_password: '',
        smtp_tls: p.smtp_tls,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load branding';
      // 503 is the feature flag, not a fault — say so plainly instead of
      // showing a red error the operator cannot act on.
      if (/not enabled/i.test(msg)) setDisabled(true);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const saveBrand = async () => {
    setSaving(true);
    try {
      await adminApi.put('/branding/me', brand);
      toast.success('Branding saved');
      void fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const saveSmtp = async () => {
    setSaving(true);
    try {
      await adminApi.put('/branding/smtp', {
        smtp_host: smtp.smtp_host,
        smtp_port: smtp.smtp_port ? Number(smtp.smtp_port) : null,
        smtp_user: smtp.smtp_user,
        smtp_from: smtp.smtp_from,
        smtp_tls: smtp.smtp_tls,
        // Only send the password when the operator typed one — an empty field
        // must not wipe a stored credential.
        ...(smtp.smtp_password ? { smtp_password: smtp.smtp_password } : {}),
      });
      toast.success('SMTP saved');
      setSmtp((s) => ({ ...s, smtp_password: '' }));
      void fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save SMTP');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await adminApi.post<{ sent: boolean; detail: string }>(
        '/branding/smtp/test',
      );
      if (res.sent) toast.success(res.detail);
      else toast.error(res.detail);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await adminApi.postForm<BrandingProfile>('/branding/logo', fd);
      toast.success('Logo uploaded');
      void fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={18} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-lg font-semibold text-text-primary">Branding</h1>
        <div className="mt-4 bg-bg-secondary border border-border-primary rounded-md p-6 text-xs text-text-secondary max-w-lg">
          <p className="mb-2 text-text-primary font-medium">
            White-label branding is switched off.
          </p>
          <p>
            Set <code className="text-accent">BRANDING_ENABLED=true</code> in the
            platform environment and restart the API to use this screen. While it
            is off, every client sees the platform brand and all mail is sent from
            the platform address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Platform brand</h1>
        <p className="text-xxs text-text-tertiary mt-0.5">
          Your brand, your link, and optionally your own domain. Everyone in your
          pool sees this instead of the platform&apos;s branding.
        </p>
      </div>

      {/* This screen writes the CALLER's row. For a super-admin that is the
          platform's own brand — not a tenant's, which is what "white-label"
          sounds like it should mean. Branding set here has repeatedly ended up
          on TuskaEx's row while the tenant's domain stayed unbranded, and
          nothing in the UI said so. */}
      <div className="bg-bg-secondary border border-border-primary rounded-md p-3 text-xxs text-text-secondary">
        <p>
          <span className="text-text-primary font-medium">
            This is TuskaEx&apos;s own brand.
          </span>{' '}
          What you set here is shown to clients in the platform&apos;s own pool.
        </p>
        <p className="mt-1">
          To brand a sub-admin&apos;s white-label, open{' '}
          <Link href="/sub-admins" className="text-accent hover:underline">
            Sub-admins
          </Link>{' '}
          → the tenant → <span className="text-text-primary">Branding</span>.
          Setting it here will not appear on their domain.
        </p>
      </div>

      <section className="bg-bg-secondary border border-border-primary rounded-md">
        <div className="px-3 py-2 border-b border-border-primary">
          <h2 className="text-xs font-semibold text-text-primary">
            <span className="text-accent">1.</span> Brand identity
          </h2>
          <p className="text-xxs text-text-tertiary mt-0.5">
            Logo and display name. Shown on every page your clients see.
          </p>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-28 h-14 rounded-md border border-border-primary bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">
              {profile?.logo_url ? (
                <img
                  src={adminMediaSrc(profile.logo_url)}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
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
                onChange={onPickFile}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                Upload logo
              </button>
              <p className="text-xxs text-text-tertiary mt-1">
                PNG, JPG or WebP. Up to 2 MB.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="block text-xxs text-text-tertiary mb-1">Brand name</span>
            <input
              value={brand.brand_name}
              onChange={(e) => setBrand((b) => ({ ...b, brand_name: e.target.value }))}
              placeholder="Shown to your clients instead of the platform name"
              className={inputCls}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">Support email</span>
              <input
                value={brand.support_email}
                onChange={(e) => setBrand((b) => ({ ...b, support_email: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">
                Support WhatsApp
              </span>
              <input
                value={brand.support_whatsapp}
                onChange={(e) =>
                  setBrand((b) => ({ ...b, support_whatsapp: e.target.value }))
                }
                placeholder="+91…"
                className={inputCls}
              />
            </label>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveBrand()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
          >
            <Save size={13} />
            Save identity
          </button>
        </div>
      </section>

      <section className="bg-bg-secondary border border-border-primary rounded-md">
        <div className="px-3 py-2 border-b border-border-primary flex items-center gap-2">
          <Link2 size={13} className="text-text-tertiary" />
          <h2 className="text-xs font-semibold text-text-primary">
            <span className="text-accent">2.</span> Branded referral link
          </h2>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-xxs text-text-tertiary">
            Share this on the platform&apos;s own hostname. Anyone signing up through
            it lands in your pool and sees your brand straight away — no DNS, no
            waiting.
          </p>
          {profile?.referral_link ? (
            <CopyField value={profile.referral_link} />
          ) : (
            <p className="text-xxs text-text-tertiary">Link unavailable.</p>
          )}
          {profile?.public_code && (
            <p className="text-xxs text-text-tertiary">
              Your code: <span className="font-mono text-text-secondary">{profile.public_code}</span>
            </p>
          )}
        </div>
      </section>

      <section className="bg-bg-secondary border border-border-primary rounded-md">
        <div className="px-3 py-2 border-b border-border-primary flex items-center gap-2">
          <Globe size={13} className="text-text-tertiary" />
          <h2 className="text-xs font-semibold text-text-primary">
            <span className="text-accent">3.</span> Connect your own domain
            <span className="text-text-tertiary font-normal"> (optional)</span>
          </h2>
        </div>
        <div className="p-3">
          {profile?.domain ? (
            <DomainSection domain={profile.domain} onChanged={() => void fetchData()} />
          ) : null}
        </div>
      </section>

      <section className="bg-bg-secondary border border-border-primary rounded-md">
        <div className="px-3 py-2 border-b border-border-primary flex items-center gap-2">
          <Mail size={13} className="text-text-tertiary" />
          <h2 className="text-xs font-semibold text-text-primary">
            <span className="text-accent">4.</span> Outbound email
          </h2>
        </div>
        <div className="p-3 space-y-3">
          <p className="text-xxs text-text-tertiary">
            Your clients&apos; email is sent from this account.{' '}
            {profile?.smtp_configured ? (
              <span className="text-buy">Configured.</span>
            ) : (
              <span className="text-sell">
                Not configured — your clients currently receive no email at all.
              </span>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">SMTP host</span>
              <input
                value={smtp.smtp_host}
                onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">Port</span>
              <input
                type="number"
                value={smtp.smtp_port}
                onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">Username</span>
              <input
                value={smtp.smtp_user}
                onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-xxs text-text-tertiary mb-1">
                Password {profile?.smtp_password_set && '(stored — leave blank to keep)'}
              </span>
              <input
                type="password"
                value={smtp.smtp_password}
                onChange={(e) => setSmtp((s) => ({ ...s, smtp_password: e.target.value }))}
                className={inputCls}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xxs text-text-tertiary mb-1">From address</span>
              <input
                value={smtp.smtp_from}
                onChange={(e) => setSmtp((s) => ({ ...s, smtp_from: e.target.value }))}
                placeholder="support@yourbrand.com"
                className={inputCls}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={smtp.smtp_tls}
              onChange={(e) => setSmtp((s) => ({ ...s, smtp_tls: e.target.checked }))}
            />
            Use STARTTLS (leave on unless the port is 465)
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSmtp()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
            >
              <Save size={13} />
              Save SMTP
            </button>
            <button
              type="button"
              disabled={testing || !profile?.smtp_configured}
              onClick={() => void sendTest()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-primary text-text-secondary disabled:opacity-50"
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send test to myself
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputCls =
  'w-full px-2.5 py-1.5 text-xs rounded-md bg-bg-tertiary border border-border-primary text-text-primary placeholder:text-text-tertiary';
