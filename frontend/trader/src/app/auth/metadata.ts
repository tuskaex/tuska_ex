import { headers } from 'next/headers';
import { isTenantHost } from '@/lib/tenantHost';

/**
 * Description text for the auth routes, chosen by hostname.
 *
 * The TITLE is no longer decided here. The root layout now carries a host-aware
 * `title.template` — "%s — TuskaEx" on the platform, "%s" on a tenant — so a
 * page states only its own name and the suffix appears where it belongs and
 * nowhere else. This helper survives for the description, which is a whole
 * sentence and cannot be composed from a template.
 *
 * On a tenant host the wording stays neutral rather than naming the tenant.
 * Naming them would mean a server-side lookup on every render of a page that
 * has to be fast and must not fail when the admin service is briefly down —
 * and the page body already carries their logo and name.
 */
export async function authMetadata(opts: {
  title: string;
  platformDescription: string;
  neutralDescription: string;
}) {
  const host = (await headers()).get('host');
  const tenant = isTenantHost(host);
  return {
    // `absolute` opts out of the root layout's "%s — TuskaEx" template. Without
    // it the template re-attached the platform name to the very page this
    // helper exists to keep clean, and the tenant's login tab read
    // "Sign In — TuskaEx" again.
    title: tenant ? { absolute: opts.title } : opts.title,
    description: tenant ? opts.neutralDescription : opts.platformDescription,
  };
}
