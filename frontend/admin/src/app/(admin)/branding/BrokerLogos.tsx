'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { adminMediaSrc } from '@/lib/mediaSrc';
import type { SubAdmin } from '@/types';
import { DEFAULT_BRAND_COLOR } from '../sub-admins/BrandColorPicker';

/**
 * Every broker's logo, uploadable straight from the Platform brand page.
 *
 * Operators kept uploading a broker's logo into "Brand identity" below — which
 * is TradesX's own row — and then found the broker's domain still showing a
 * text name. The picker above only navigates, so it was easy to miss. Listing
 * the brokers here, each with its own upload button, puts the right target in
 * front of them. Uploads go to POST /sub-admins/{id}/branding/logo, the same
 * endpoint the broker's own Branding panel uses.
 */
export default function BrokerLogos({
  tenants,
  onChanged,
}: {
  tenants: SubAdmin[];
  onChanged: () => void;
}) {
  return (
    <section className="bg-bg-secondary border border-accent/40 rounded-md">
      <div className="px-4 py-3 border-b border-border-primary">
        <h2 className="text-sm font-semibold text-text-primary">Broker logos</h2>
        <p className="text-xxs text-text-tertiary mt-0.5">
          Shown on each broker&apos;s own domain — login and sign-up forms, sidebar and browser tab.
          Upload a broker&apos;s logo here, not in &quot;Brand identity&quot; below (that one is TradesX&apos;s).
        </p>
      </div>
      <ul className="divide-y divide-border-primary">
        {tenants.map((t) => (
          <BrokerRow key={t.id} tenant={t} onChanged={onChanged} />
        ))}
      </ul>
    </section>
  );
}

function BrokerRow({ tenant, onChanged }: { tenant: SubAdmin; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const logo = adminMediaSrc(tenant.logo_url);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Logo must be a PNG, JPG or WebP image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2 MB or smaller');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    try {
      await adminApi.postForm(`/sub-admins/${tenant.id}/branding/logo`, fd);
      toast.success(`Logo saved for ${tenant.brand_name || tenant.full_name || tenant.email}`);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not upload logo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="h-12 w-20 shrink-0 rounded-md border border-border-primary bg-bg-tertiary flex items-center justify-center overflow-hidden">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xxs text-text-tertiary">No logo</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-primary truncate">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: tenant.brand_color || DEFAULT_BRAND_COLOR }}
          />
          {tenant.brand_name || tenant.full_name || tenant.email}
        </p>
        <p className="text-xxs text-text-tertiary truncate">
          {tenant.domain?.custom_domain || 'no domain'} · {tenant.email}
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {logo ? 'Replace logo' : 'Upload logo'}
      </button>
      <Link
        href={`/sub-admins/${tenant.id}`}
        className="hidden sm:block text-xxs text-text-secondary hover:text-text-primary underline"
      >
        More
      </Link>
    </li>
  );
}
