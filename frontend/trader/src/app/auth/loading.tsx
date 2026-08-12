/**
 * Loading boundary for the auth routes — deliberately brand-free.
 *
 * Without this, /auth/* falls through to app/loading.tsx, which renders
 * BrandLoader: TuskaEx's logo, full screen. That was harmless while these
 * pages were static, and stopped being harmless the moment they became
 * server-rendered per request, because a white-label tenant's clients then got
 * the parent platform's mark full-screen on the way to their broker's own
 * login page.
 *
 * A spinner cannot name the wrong brand, and the tenant's mark is not
 * available here anyway — this renders before the page's server work, so
 * nothing has resolved who owns the domain yet.
 */
export default function AuthLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
