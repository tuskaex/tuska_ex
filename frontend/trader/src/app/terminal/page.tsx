'use client';

/**
 * `/terminal` — the staging route between the CRM and the trading terminal.
 *
 * Every "Trade" affordance in the CRM points here instead of straight at the
 * terminal, because the redirect needs a freshly minted handoff code and
 * minting is an async call — something a `<Link href>` cannot do.
 *
 * Deliberately NOT under `/trading/`: that segment's layout mounts
 * `TradingSession`, which opens WebSockets and starts four polling intervals.
 * On a page whose whole job is to redirect within a few hundred milliseconds,
 * all of that is thrown away the moment it connects.
 *
 * When the terminal has not been split onto its own domain (env var unset, e.g.
 * local dev) nothing routes here at all — `tradingTerminalUrl` keeps returning
 * `/trading/terminal` directly.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { BRAND_NAME } from '@/config/brand';
import {
  buildTerminalUrl,
  createHandoffCode,
  shouldHandOffToTerminal,
} from '@/lib/terminalHandoff';

/**
 * SpeedTrade's wordmark, served from this app rather than linked off
 * speedtrade.tech.
 *
 * A loading screen that waits on a cross-origin image can render empty for as
 * long as that request takes, and shows nothing at all if it fails — the exact
 * moment the user most needs to see something. Same-origin, it paints with the
 * rest of the page.
 *
 * The copy is checked into this repo, so it does NOT follow the landing site
 * automatically the way the terminal's own logo does (that one is proxied live
 * in deploy/nginx/speedtrade.conf). Re-download it if the brand changes:
 *   curl -o frontend/trader/public/marketing/speedtrade-logo.png \
 *        https://speedtrade.tech/images/logo.png
 */
const SPEEDTRADE_LOGO = '/marketing/speedtrade-logo.png';

/**
 * Branded full-screen hold.
 *
 * This is the only thing the user sees between clicking Trade and the terminal
 * domain taking over, and that gap is a whole network round-trip — mint a
 * handoff code, then a cross-domain navigation. An unbranded spinner on a blank
 * page in that window reads as a broken redirect, especially since the address
 * bar is about to change to a different domain.
 *
 * It shows SpeedTrade, not TuskaEx: the point of the screen is to explain where
 * the user is being taken. The TuskaEx account is named in the sub-line
 * instead, which is what makes the domain change read as intentional.
 */
function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-bg-primary px-6 text-center">
      <Image
        src={SPEEDTRADE_LOGO}
        alt="SpeedTrade"
        width={293}
        height={64}
        priority
        className="h-8 w-auto sm:h-10"
      />
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-[#D60101]"
      role="status"
      aria-label="Opening trading terminal"
    />
  );
}

function LaunchTerminal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [error, setError] = useState<string | null>(null);
  /* Guards against React 18 StrictMode's double-invoke in dev, and against a
   * re-render minting a second code while the first redirect is in flight. */
  const startedRef = useRef(false);

  const launch = useCallback(async () => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    /* The same Next app serves both domains, so "am I the terminal?" is a
     * runtime host question. If we are already there, there is no session to
     * hand across — render the terminal directly. */
    if (!shouldHandOffToTerminal()) {
      const q = new URLSearchParams(params).toString();
      router.replace(q ? `/trading/terminal?${q}` : '/trading/terminal');
      return;
    }

    const code = await createHandoffCode();
    /* replace(), not assign(): Back must return to wherever the user came
     * from, not to this page, which would mint a second code on every press. */
    window.location.replace(buildTerminalUrl(code, params));
  }, [router, searchParams]);

  useEffect(() => {
    /* Wait for AuthProvider to settle. An unauthenticated user is already
     * being routed to /auth/login by it — minting here would only 401. */
    if (!isInitialized || !isAuthenticated) return;
    if (startedRef.current) return;
    startedRef.current = true;

    launch().catch(() => {
      setError('Could not open the trading terminal. Please try again.');
      startedRef.current = false; // allow Retry
    });
  }, [isInitialized, isAuthenticated, launch]);

  const onRetry = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    launch().catch(() => {
      setError('Could not open the trading terminal. Please try again.');
      startedRef.current = false;
    });
  };

  if (error) {
    return (
      <Splash>
        <p className="text-sm text-text-secondary">{error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-buy px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text-secondary"
          >
            Back to dashboard
          </button>
        </div>
      </Splash>
    );
  }

  return (
    <Splash>
      <Spinner />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-text-primary">
          Opening your trading terminal…
        </p>
        <p className="text-xs text-text-tertiary">
          Signing you in securely from your {BRAND_NAME} account.
        </p>
      </div>
    </Splash>
  );
}

export default function TerminalLaunchPage() {
  /* useSearchParams needs a Suspense boundary or the whole route is forced
   * dynamic at build time. */
  return (
    <Suspense
      fallback={
        <Splash>
          <Spinner />
        </Splash>
      }
    >
      <LaunchTerminal />
    </Suspense>
  );
}
