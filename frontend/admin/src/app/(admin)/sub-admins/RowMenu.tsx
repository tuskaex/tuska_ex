'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const menuRef = useRef<HTMLDivElement>(null);

  /* The menu renders into document.body, not next to its button.
   *
   * The table it lives in is wrapped in `overflow-x-auto` for narrow screens,
   * and that makes the wrapper a clipping context: an absolutely-positioned
   * menu inside it gets cut off at the row's edge. The menu did open — you
   * just only ever saw its first item. Once one axis is not `visible`, CSS
   * computes the other to `auto` too, so it clipped vertically as well.
   *
   * A portal escapes the wrapper entirely, which means position:fixed against
   * the trigger's viewport rect, recomputed while it is open. */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const MENU_W = 208; // w-52
  const place = useCallback(() => {
    const btn = ref.current?.querySelector('button');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 0;
    // Right-aligned to the trigger, and flipped above it when there is not
    // enough room below — the last rows of a long table are near the fold.
    const below = r.bottom + 4;
    const flip = menuH > 0 && below + menuH > window.innerHeight - 8;
    setPos({
      top: flip ? Math.max(8, r.top - menuH - 4) : below,
      left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      // Both nodes: the trigger lives in the table, the menu in a portal, so
      // neither contains the other.
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setConfirmRetire(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setConfirmRetire(false); }
    };
    // `true` — catch scrolls on the table wrapper, not just the window, or the
    // menu detaches from its row when the table scrolls under it.
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

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

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          // Hidden until measured: the first paint has no height to flip
          // against, and showing it at 0,0 for a frame reads as a glitch.
          className={`fixed z-50 w-52 rounded-md border border-border-primary bg-bg-secondary shadow-modal py-1 ${pos ? '' : 'invisible'}`}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
