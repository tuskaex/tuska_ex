'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Light/dark switch for the admin top bar.
 *
 * Renders a fixed-size placeholder until mounted. The theme comes from
 * localStorage, which the server cannot know, so drawing the real icon on the
 * first client render would mismatch the server's HTML and React would warn on
 * hydration. Reserving the same box also stops the top bar shifting once the
 * icon appears.
 */
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 transition-fast"
      title={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
      aria-label={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
    >
      {mounted ? (
        isDark ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <span className="block w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}
