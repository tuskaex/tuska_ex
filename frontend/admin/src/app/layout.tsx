import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeInitScript from '@/components/ThemeInitScript';
import AppToaster from '@/components/AppToaster';
import TenantFavicon from '@/components/TenantFavicon';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * Resolved per request, not a constant.
 *
 * This build serves TuskaEx's own back office and every white-label tenant's,
 * so a fixed title put the parent platform's name in the browser tab of a
 * panel the tenant was sold as their own.
 *
 * Neutral wording on a tenant host rather than the tenant's own name: naming
 * them would mean a lookup on every render of a page that must not break when
 * the admin service blinks, and the sidebar already carries their logo.
 */
const TRANSPARENT_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host');
  const platform = (process.env.NEXT_PUBLIC_PLATFORM_ADMIN_HOST ?? '').trim().toLowerCase();
  const isTenant = Boolean(platform) && (host ?? '').toLowerCase() !== platform;
  return isTenant
    ? {
        title: 'Admin',
        description: 'Broker administration panel',
        // `src/app/icon.png` is one file served to every host, so a tenant's
        // tab and address bar carried TuskaEx's logo. An explicit `icons`
        // beats the file convention; the placeholder holds the slot until
        // <TenantFavicon /> swaps in their real logo. Transparent rather
        // than TuskaEx's: an empty tab icon for a moment is fine, another
        // company's is not.
        icons: { icon: TRANSPARENT_ICON },
      }
    : { title: 'TuskaEx Admin', description: 'TuskaEx broker administration panel' };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable} style={{ ['--font-jetbrains' as string]: "ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace" }}>
      {/* `suppressHydrationWarning` on <body> is required because several
          browser extensions inject attributes into <body> after page
          load (ColorZilla → `cz-shortcut-listen`, Grammarly →
          `data-new-gr-c-s-check-loaded`, Honey, LastPass, dark-reader,
          etc.). The server never renders those attributes, so React's
          hydration check on the body element will always fail unless we
          tell it to ignore mismatches on this one node. The flag only
          affects the body's own attributes, not its children — every
          real mismatch deeper in the tree still surfaces. Same flag
          already lives on <html> above for the theme-init script. */}
      <body
        className={`${inter.className} min-h-screen bg-bg-page text-text-primary antialiased`}
        suppressHydrationWarning
      >
        <ThemeInitScript />
        <TenantFavicon />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
