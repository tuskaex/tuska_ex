'use client';

/**
 * Admin sign-in — a single centred card: brand mark, then email + password.
 *
 * This page is served on TuskaEx's own admin host AND on every white-label
 * tenant's, so the mark comes from whoever owns the hostname and no copy on it
 * names anybody. Functional layer unchanged: email + password against the admin
 * JWT store, then landingRouteForCurrentAdmin() decides where to go — a
 * sub-admin cannot open /dashboard.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTenantBrand } from '@/hooks/useTenantBrand';
import { landingRouteForCurrentAdmin } from '@/lib/landingRoute';
import {
  Lock, Mail, Loader2, AlertCircle, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/stores/authStore';
import { useAuthRehydrated } from '@/hooks/useAuthRehydrated';

export default function AdminLoginForm({ serverHost }: { serverHost?: string | null }) {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const authRehydrated = useAuthRehydrated();

  const brand = useTenantBrand(serverHost);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authRehydrated) return;
    if (isAuthenticated) void landingRouteForCurrentAdmin().then((r) => router.replace(r));
  }, [authRehydrated, isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back');
      router.push(await landingRouteForCurrentAdmin());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Single centred column, logo above the form.
     *
     * The old layout was a two-panel card whose left half was a dark hero
     * reading "Operator console for the TuskaEx platform" — the parent
     * platform named, in bold, on every white-label tenant's own admin login,
     * in front of that tenant's staff. A hero panel that cannot be written
     * without naming somebody is the wrong shape for a page that has to serve
     * every brand, so it is gone rather than made conditional: one layout,
     * nothing to keep in sync, and no copy that can leak the wrong name.
     */
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-8 md:p-10">

        {/* Brand mark. Fixed height so the card does not jump when a tenant's
            logo resolves a moment after first paint. */}
        <div className="flex items-center justify-center min-h-[5.5rem] mb-6">
          {brand.isTenant ? (
            brand.logoUrl ? (
              /* Plain <img>: a tenant logo is served at runtime, so next/image
                 would need its path in remotePatterns at BUILD time —
                 impossible for domains added after the build. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={brand.logoUrl} alt={brand.brandName || ''} className="h-20 w-auto object-contain" />
            ) : brand.brandName ? (
              <span className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">{brand.brandName}</span>
            ) : null
          ) : (
            <Image src="/logo.png" alt="TuskaEx" width={200} height={44} priority className="h-20 w-auto object-contain" />
          )}
        </div>

        <div className="mb-7 text-center">
          <h2 className="text-2xl font-medium mb-1.5 tracking-tight text-[#0A0A0A]">Admin login</h2>
          <p className="text-sm text-[#5B5B5B]">Authorised personnel only.</p>
        </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-[#0A0A0A]">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] pointer-events-none" />
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="text-sm w-full py-2.5 pl-10 pr-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D60101]/20 focus:border-[#D60101] bg-white text-black transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-[#0A0A0A]">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="text-sm w-full py-2.5 pl-10 pr-10 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D60101]/20 focus:border-[#D60101] bg-white text-black transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#0A0A0A] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D60101] hover:bg-[#A30000] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors inline-flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-xs text-[#9A9A9A] mt-1">
              All sign-in attempts are logged with IP and device fingerprint.
            </p>
          </form>
      </div>
    </div>
  );
}
