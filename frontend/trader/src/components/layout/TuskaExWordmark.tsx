'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { isOnTerminalHost } from '@/lib/terminalHandoff';

/**
 * Brand marks, chosen by the host this is being served on.
 *
 * One trader build serves both tuskaex.com and speedtrade.tech, so the brand
 * cannot be a build-time constant.
 *
 * This was first attempted in nginx, aliasing the TuskaEx paths to SpeedTrade's
 * assets on that host. It cannot work: these render through next/image, so the
 * browser never requests /marketing/… at all — it requests
 * /_next/image?url=%2Fmarketing%2F…, and the optimiser then fetches the
 * original from the app itself, never passing through nginx. The alias applied
 * to a request nobody makes.
 *
 * A runtime host check is safe here even though it is client-only: everything
 * that renders this sits under AuthProvider, which returns null until the
 * session resolves, so the terminal chrome never server-renders. There is no
 * SSR pass to disagree with and therefore no flash of the wrong brand.
 */
const BRAND_BY_HOST = {
  tuskaex: { logo: '/marketing/tuskaex-logo.png', mark: '/marketing/tuskaex_fevicon.png', name: 'TuskaEx' },
  speedtrade: { logo: '/marketing/speedtrade-logo.png', mark: '/marketing/speedtrade-icon.png', name: 'SpeedTrade' },
} as const;

function brand() {
  return isOnTerminalHost() ? BRAND_BY_HOST.speedtrade : BRAND_BY_HOST.tuskaex;
}

type Props = {
  href?: string;
  className?: string;
  /** Applied to the wordmark text (e.g. responsive sizes). */
  textClassName?: string;
  /** Default: sidebar / header. Rail: tiny terminal left bar. */
  variant?: 'default' | 'rail';
  /** Hide the brand mark and render the wordmark only. Useful in
   *  contexts where the mark would clash (small badge embeds). */
  hideFlag?: boolean;
};


/**
 * Text wordmark for dashboard chrome. Pure typography next to the
 * TuskaEx mark — no raster dependency — so the brand renders
 * identically across DPRs and any background.
 *
 * Visual split: "Tuska" in primary text colour, "Ex" in the brand
 * indigo accent. Swap the two `<span>` halves to retheme without
 * touching any call-site. Set `hideFlag` if the surrounding chrome
 * already shows its own brand mark.
 */
export function TuskaExWordmark({
  href = '/dashboard',
  className,
  textClassName,
  variant = 'default',
  hideFlag = false,
}: Props) {
  if (variant === 'rail') {
    // Terminal-left-rail variant — only ~36px wide. Renders the brand
    // favicon PNG (same asset as the browser tab icon) so the mark is
    // consistent across the app. `hideFlag` is honoured as the
    // backwards-compatible "letter fallback" mode in case marketing
    // ever wants the T+E lockup again.
    return (
      <Link
        href={href}
        title="Trading home"
        className={cn(
          'flex items-center justify-center rounded-md hover:bg-bg-hover w-9 h-9 transition-colors',
          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#D60101]',
          className,
        )}
      >
        {hideFlag ? (
          <span className="inline-flex items-baseline font-bold tracking-tight text-base select-none">
            <span className="text-text-primary">T</span>
            <span className="text-[#D60101]">E</span>
          </span>
        ) : (
          <Image
            src={brand().mark}
            alt={brand().name}
            width={28}
            height={28}
            priority
            className="w-7 h-7 object-contain rounded-md"
          />
        )}
      </Link>
    );
  }

  // textClassName preserved for backward compatibility with callers
  // that previously controlled the inner text sizing. Now that the
  // wordmark renders the full logo image, those classes apply to the
  // outer link (e.g. extra margin) — they're a no-op on the image
  // height itself, which is driven by Tailwind h-* below.
  void textClassName;

  return (
    <Link
      href={href}
      aria-label={`${brand().name} home`}
      className={cn(
        'inline-flex items-center min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D60101]/60 focus-visible:rounded-md',
        className,
      )}
    >
      <Image
        src={brand().logo}
        alt={brand().name}
        width={220}
        height={48}
        priority
        className="h-9 sm:h-10 w-auto"
      />
    </Link>
  );
}
