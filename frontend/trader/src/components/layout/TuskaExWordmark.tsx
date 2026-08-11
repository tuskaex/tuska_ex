import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* On speedtrade.tech these paths are served the SpeedTrade logo instead — the
 * swap is in deploy/nginx/speedtrade.conf, not here. One trader build serves
 * both hosts, so the brand cannot be a build-time constant, and switching it
 * in React would flash the wrong mark between SSR and hydration. Renaming
 * these files means updating those exact-match locations too. */
const LOGO_SRC = '/marketing/tuskaex-logo.png';

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
            src="/marketing/tuskaex_fevicon.png"
            alt="TuskaEx"
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
      aria-label="TuskaEx home"
      className={cn(
        'inline-flex items-center min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D60101]/60 focus-visible:rounded-md',
        className,
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="TuskaEx"
        width={220}
        height={48}
        priority
        className="h-9 sm:h-10 w-auto"
      />
    </Link>
  );
}
