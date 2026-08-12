import { adminApi } from '@/lib/api';

/**
 * Where an admin belongs after signing in.
 *
 * /dashboard is guarded by `analytics.view` and is NOT tenant_safe, so the API
 * refuses it to a white-label sub-admin — which made the landing page after
 * login a 403 for every tenant operator. They arrived at their own back office
 * and the first thing it said was "not available to white-label sub-admins".
 *
 * /users is tenant_safe and is the section a tenant actually runs their day
 * from: their own pool of clients.
 *
 * Falls back to /dashboard on any failure. A super-admin briefly seeing the
 * generic landing is harmless; guessing wrong the other way is not.
 */
export async function landingRouteForCurrentAdmin(): Promise<string> {
  try {
    const me = await adminApi.get<{ role?: string }>('/auth/me');
    return me?.role === 'sub_admin' ? '/users' : '/dashboard';
  } catch {
    return '/dashboard';
  }
}
