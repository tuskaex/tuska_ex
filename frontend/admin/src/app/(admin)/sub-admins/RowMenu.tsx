'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  MoreVertical, LogIn, Eye, KeyRound, Ban, CheckCircle2, Archive, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SubAdmin } from '@/types';

export default function RowMenu({
  sub,
  onChanged,
}: {
  sub: SubAdmin;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmRetire(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setOpen(false);
      setConfirmRetire(false);
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async () => {
    try {
      const res = await adminApi.post<{ access_token: string }>(
        `/sub-admins/${sub.id}/impersonate`,
      );
      toast.success(`Acting as ${sub.email}`);
      if (typeof window !== 'undefined') {
        adminApi.setToken(res.access_token);
        useAuthStore.setState({ isAuthenticated: true, admin: null });
        setTimeout(() => window.location.replace('/dashboard'), 400);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not sign in as this tenant');
    }
  };

  const resetPassword = async () => {
    const pw = window.prompt(`New password for ${sub.email} (min 8 characters)`);
    if (pw === null) return;
    if (pw.length < 8) return toast.error('Password must be at least 8 characters');
    await run(
      () => adminApi.post(`/sub-admins/${sub.id}/reset-password`, { new_password: pw }),
      'Password reset',
    );
  };

  const item =
    'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary text-left';

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded text-text-tertiary hover:text-text-primary"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Actions"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <MoreVertical size={15} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-52 rounded-md border border-border-primary bg-bg-secondary shadow-modal py-1"
        >
          <button type="button" className={item} onClick={() => void impersonate()}>
            <LogIn size={13} /> Sign in as this tenant
          </button>
          <button
            type="button"
            className={item}
            onClick={() => router.push(`/sub-admins/${sub.id}`)}
          >
            <Eye size={13} /> Open profile
          </button>
          <button type="button" className={item} onClick={() => void resetPassword()}>
            <KeyRound size={13} /> Reset password
          </button>

          {sub.status === 'active' ? (
            <button
              type="button"
              className={item}
              onClick={() =>
                void run(() => adminApi.post(`/sub-admins/${sub.id}/block`), 'Blocked')
              }
            >
              <Ban size={13} /> Block
            </button>
          ) : (
            <button
              type="button"
              className={item}
              onClick={() =>
                void run(() => adminApi.post(`/sub-admins/${sub.id}/unblock`), 'Unblocked')
              }
            >
              <CheckCircle2 size={13} /> Unblock
            </button>
          )}

          <div className="my-1 border-t border-border-primary" />

          {confirmRetire ? (
            <div className="px-3 py-2 space-y-1.5">
              <p className="text-xxs text-text-tertiary leading-relaxed">
                Releases {sub.user_count} client{sub.user_count === 1 ? '' : 's'} to the
                platform pool and disables the login. The account is kept so its
                audit history survives.
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="px-2 py-1 text-xxs rounded bg-sell text-white"
                  onClick={() =>
                    void run(
                      () => adminApi.delete(`/sub-admins/${sub.id}`),
                      'Tenant deactivated',
                    )
                  }
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xxs rounded border border-border-primary text-text-secondary"
                  onClick={() => setConfirmRetire(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`${item} text-sell hover:text-sell`}
              onClick={() => setConfirmRetire(true)}
            >
              <Archive size={13} /> Deactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
