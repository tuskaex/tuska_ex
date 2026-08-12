/**
 * Sign-in page — thin wrapper around the shared FullScreenSignup card. The card
 * owns the form state, validation and auth-store wiring; this page selects the
 * `login` variant and tells it which hostname it is being served on.
 *
 * A SERVER component, deliberately. This page renders on white-label tenant
 * domains as well as TuskaEx's own, and the brand it must wear depends on the
 * host. Left as a client component the server had no host to go on, so the
 * first HTML shipped TuskaEx's logo and the browser replaced it after
 * hydration — a visible flash of the parent platform's brand on a broker's own
 * login page, in front of that broker's clients.
 *
 * Reading headers() opts this route out of static generation. That costs
 * nothing here: it is an auth page, it is uncacheable and unindexed anyway.
 */

import { headers } from 'next/headers';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';

export default async function LoginPage() {
  const host = (await headers()).get('host');
  return <FullScreenSignup mode="login" serverHost={host} />;
}
