/**
 * Is this hostname TuskaEx's, or a white-label tenant's?
 *
 * No 'use client' here on purpose. Both sides need this answer and they must
 * reach the SAME one: the server decides what the first HTML says, the browser
 * decides what happens after hydration, and if they disagree the page paints
 * one brand and then swaps to another. Keeping it in a boundary-free module
 * lets a server component and a client component share the identical function
 * rather than two implementations that drift.
 */

/** TuskaEx's own hostnames. Everything else is somebody's white label. */
function platformHosts(): string[] {
  return [
    process.env.NEXT_PUBLIC_MARKETING_HOST,
    process.env.NEXT_PUBLIC_TRADE_HOST,
    (() => {
      const t = (process.env.NEXT_PUBLIC_TERMINAL_ORIGIN ?? '').trim();
      if (!t) return '';
      try { return new URL(t).host; } catch { return ''; }
    })(),
  ]
    .filter(Boolean)
    .map((h) => String(h).toLowerCase());
}

/**
 * `host` is passed in during SSR (from the Host header) and omitted in the
 * browser, where window.location is authoritative.
 */
export function isTenantHost(host?: string | null): boolean {
  const here = (host ?? (typeof window !== 'undefined' ? window.location.host : '')).toLowerCase();
  if (!here) return false;
  const hosts = platformHosts();
  // Nothing configured (local dev) → treat everything as TuskaEx, otherwise
  // `npm run dev` on localhost would render an unbranded shell.
  if (hosts.length === 0) return false;
  return !hosts.includes(here);
}
