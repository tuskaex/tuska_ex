/**
 * Sign-up page — thin wrapper around the shared FullScreenSignup card.
 * ProfileCompleteGate prompts for first/last name + phone + country the first
 * time the new user hits the dashboard, so we only collect email + password
 * here.
 *
 * A SERVER component for the same reason as the sign-in page: the brand this
 * renders depends on the hostname, and only the server knows it in time for the
 * first HTML. See app/auth/login/page.tsx.
 */

import { headers } from 'next/headers';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';

export default async function RegisterPage() {
  const host = (await headers()).get('host');
  return <FullScreenSignup mode="signup" serverHost={host} />;
}
