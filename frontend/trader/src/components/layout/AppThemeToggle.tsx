'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

/**
 * Light/dark switch for the signed-in app chrome.
 *
 * Drives uiStore.theme, which ThemeProvider applies to <html>/<body>, so one
 * switch covers the dashboard, portfolio, terminal and the rest of the app.
 * The marketing pages keep their own separate preference — that layout writes
 * html.data-theme while mounted and restores it on the way out.
 *
 * Nothing is rendered until mounted: the value comes from persisted storage,
 * which the server cannot know, so drawing the real icon on the first client
 * render would be a hydration mismatch. The box is still reserved so the
 * navbar does not shift when the icon appears.
 */
export default function AppThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
      title={mounted ? label : 'Toggle theme'}
      aria-label={mounted ? label : 'Toggle theme'}
    >
      {mounted ? (
        isDark ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <span className="block h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
