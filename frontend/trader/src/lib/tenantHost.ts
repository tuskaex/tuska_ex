/**
 * Is this hostname TuskaEx's, or a white-label tenant's?
 *
 * No 'use client' here on purpose. Both sides need this answer and they must
 * reach the SAME one: the server decides what the first HTML says, the browser
 * decides what happens after hydration, and if they disagree the page paints
 * one brand and then swaps to another. Keeping it in a boundary-free module
 * lets a server component, a client component and the middleware share the
 * identical function rather than implementations that drift.
 */

/**
 * TuskaEx's production hosts are built in, not only read from build-time env.
 * A build made without NEXT_PUBLIC_MARKETING_HOST / NEXT_PUBLIC_TRADE_HOST
 * would treat every host as TuskaEx's, so every tenant domain would silently
 * serve the parent's marketing site. speedtrade.tech is TuskaEx's own terminal
 * domain, not a tenant. Local hosts count as the platform for dev.
 */
const BUILT_IN_PLATFORM_HOSTS = [
  'tuskaex.com', 'www.tuskaex.com', 'trade.tuskaex.com',
  'speedtrade.tech', 'www.speedtrade.tech',
  'localhost', '127.0.0.1',
];

function hostOnly(raw: string): string {
  const h = raw.trim().toLowerCase();
  return h.split(':')[0] ?? h;
}

/** TuskaEx's own hostnames. Everything else is somebody's white label. */
export function platformHosts(): string[] {
  const configured = [
    process.env.NEXT_PUBLIC_MARKETING_HOST,
    process.env.NEXT_PUBLIC_TRADE_HOST,
    (() => {
      const t = (process.env.NEXT_PUBLIC_TERMINAL_ORIGIN ?? '').trim();
      if (!t) return '';
      try { return new URL(t).host; } catch { return ''; }
    })(),
  ]
    .filter(Boolean)
    .map((h) => hostOnly(String(h)));
  return Array.from(new Set([...configured, ...BUILT_IN_PLATFORM_HOSTS]));
}

/**
 * `host` is passed in during SSR / middleware (from the Host header) and
 * omitted in the browser, where window.location is authoritative.
 */
export function isTenantHost(host?: string | null): boolean {
  const here = hostOnly(host ?? (typeof window !== 'undefined' ? window.location.host : ''));
  if (!here) return false;
  return !platformHosts().includes(here);
}
