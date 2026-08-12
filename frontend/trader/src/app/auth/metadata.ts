import { headers } from 'next/headers';
import { isTenantHost } from '@/lib/tenantHost';

/**
 * Page metadata for the auth routes, chosen by hostname.
 *
 * These pages are served on white-label tenant domains as well as TuskaEx's
 * own. A constant `title: 'Sign In — TuskaEx'` therefore printed the parent
 * platform's name in the browser tab of every broker's login page — in front
 * of that broker's clients, who have no relationship with the parent.
 *
 * On a tenant host it falls back to neutral wording rather than the tenant's
 * own name. Naming the tenant would mean a server-side lookup on every render
 * of a page that has to be fast and must not fail if the admin service is
 * briefly down; a title that says "Sign In" is honest and costs nothing, and
 * the page body itself carries the tenant's logo and name.
 */
export async function authMetadata(opts: {
  platformTitle: string;
  platformDescription: string;
  neutralTitle: string;
  neutralDescription: string;
}) {
  const host = (await headers()).get('host');
  const tenant = isTenantHost(host);
  return {
    title: tenant ? opts.neutralTitle : opts.platformTitle,
    description: tenant ? opts.neutralDescription : opts.platformDescription,
  };
}
