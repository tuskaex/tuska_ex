/**
 * Server component on purpose.
 *
 * This page renders on TuskaEx's admin host and on every white-label tenant's,
 * and which brand it wears depends on the hostname. As a client component the
 * server had no host to go on, so the first HTML shipped TuskaEx's logo and the
 * browser replaced it after hydration — a visible flash of the parent
 * platform's mark on a tenant's own admin login, in front of their staff.
 *
 * Reading headers() opts this route out of static generation, which costs
 * nothing here: it is a login page, uncacheable and unindexed either way.
 */

import { headers } from 'next/headers';
import AdminLoginForm from './LoginForm';

export default async function AdminLoginPage() {
  const host = (await headers()).get('host');
  return <AdminLoginForm serverHost={host} />;
}
