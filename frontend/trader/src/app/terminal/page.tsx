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
 * It shows SpeedTrade, not TuskaEx: the point of the screen is to say where the
 * user is being taken, so that the address bar changing to another domain a
 * moment later reads as intentional. The wordmark carries that on its own —
 * explanatory copy used to sit under the spinner but the screen is rarely up
 * long enough to read a sentence, so it only flashed past as clutter.
 *
 * ── Light only, and every colour hard-coded ──────────────────────────────
 * The wordmark is solid dark ink on transparency, so on the CRM's dark theme
 * it was black on black — the screen rendered with an invisible logo.
 *
 * Forcing light is not a workaround for that, it is the correct end state: the
 * terminal this screen hands off to is itself light-only (see
 * app/trading/layout.tsx, which pins data-theme="light" because the dark theme
 * was retired). Matching it also removes a theme flip mid-handoff.
 *
 * The colours are literals rather than theme tokens on purpose. This is the one
 * screen a user sees while the address bar changes to another domain; if it
 * ever rendered wrong it would look like a hijack. A token whose light value is
 * retuned later cannot break it.
 */
function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="theme-light flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-white px-6 text-center"
      data-theme="light"
    >
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

/* SpeedTrade blue (#1b4dff), not TuskaEx red — this screen wears the
 * destination's brand. It is SpeedTrade's `--color-brand`, what its own buttons
 * and links use; #0b2ecc is the matching hover.
 *
 * Its red `--color-speed` (#ff3b2f) is deliberately not used: the landing
 * site's globals.css documents that token as accent-only at 3.5:1 contrast,
 * for the logo mark, badges and the live dot. */
function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-[#1b4dff]"
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
        <p className="text-sm text-neutral-600">{error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-[#1b4dff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b2ecc]"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Back to dashboard
          </button>
        </div>
      </Splash>
    );
  }

  /* Logo and spinner only. The screen is typically on-screen for well under a
   * second, which is not long enough to read a sentence — the copy landed as
   * clutter that flashed past. The spinner keeps role="status" and its
   * aria-label, so assistive tech is still told what is happening.
   *
   * The error branch above is the exception and still uses words: that state
   * persists until the user acts, and it has to say what went wrong. */
  return (
    <Splash>
      <Spinner />
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
