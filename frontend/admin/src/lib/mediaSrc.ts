/**
 * Rewrites a stored media path so the admin UI can actually load it.
 *
 * Banner and branding URLs are stored trader-facing — `/api/v1/banners/media/x`
 * and `/api/v1/admin/branding/media/x`. On admin.tuskaex.com nginx has no
 * location for `/api/`, so the request reaches Next, whose `/api/:path*`
 * rewrite sends it to the gateway. The gateway serves neither of those routes,
 * so the <img> 404s and renders as a broken image with nothing in any log.
 *
 * `/admin-api/*` is the proxy that does reach the admin service
 * (src/app/admin-api/[...path]/route.ts), so every stored media path has to be
 * mapped onto it before it goes into a `src`.
 *
 * Absolute URLs are returned untouched: those are already fully addressed and
 * may point at another origin entirely.
 */
export function adminMediaSrc(stored: string | null | undefined): string {
  if (!stored) return '';
  if (/^https?:\/\//i.test(stored)) return stored;
  const m = stored.match(
    /\/api\/v1\/(?:admin\/)?(banners|branding)\/media\/([^/?#]+)/,
  );
  if (m) return `/admin-api/${m[1]}/media/${encodeURIComponent(m[2])}`;
  return stored;
}
