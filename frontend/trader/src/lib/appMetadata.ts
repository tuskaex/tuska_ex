import { headers } from 'next/headers';
import { isTenantHost } from '@/lib/tenantHost';

/**
 * Page title for the authenticated app, chosen by hostname.
 *
 * The root layout appends " — TuskaEx" through a title template. That is right
 * on the platform and wrong on a white-label domain, where it printed the
 * parent platform's name in the browser tab of a broker's own dashboard, in
 * front of that broker's clients.
 *
 * On a tenant host we return `title.absolute`, which is Next's way of opting a
 * page out of its parent's template, so the tab reads just "Dashboard".
 *
 * WHY THIS LIVES HERE AND NOT IN THE ROOT LAYOUT
 * Reading `headers()` in the root layout would decide the suffix once for
 * everything — simpler, and it costs the marketing site its static rendering:
 * `headers()` there opts EVERY route into dynamic rendering (measured: 67
 * prerendered routes down to 2). The authenticated app is dynamic regardless,
 * so paying that cost only here is free. The landing pages keep the suffix and
 * keep being prerendered; they are TuskaEx's own marketing and a tenant domain
 * serving them at all is a separate routing question.
 *
 * The title stays neutral rather than naming the tenant — that would need a
 * lookup per render on a page that must not fail when the admin service is
 * down, and the page body already carries their logo and name.
 */
export async function appMetadata(title: string, description?: string) {
  const host = (await headers()).get('host');
  const tenant = isTenantHost(host);
  return {
    title: tenant ? { absolute: title } : title,
    ...(description ? { description } : {}),
  };
}
