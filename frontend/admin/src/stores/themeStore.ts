'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminTheme = 'light' | 'dark';

// Keep these in step with the token blocks in globals.css. They are only the
// pre-paint backdrop — every real surface comes from the CSS variables — but a
// mismatch shows as a flash of the wrong colour behind the app on load. The
// light value used to be #f2efe9, a cream left over from an older palette,
// against a stylesheet whose light --c-bg-page is plain white.
const SURFACE: Record<AdminTheme, { bg: string; fg: string }> = {
  light: { bg: '#ffffff', fg: '#0a0a0a' },
  dark: { bg: '#050707', fg: '#f0f0f0' },
};

function applyThemeClass(theme: AdminTheme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.toggle('dark', theme === 'dark');
  el.classList.toggle('light', theme === 'light');
  // Both are set because globals.css keys off either — `html.dark` and
  // `[data-theme='dark']` — and Tailwind's darkMode:'class' needs the class.
  el.setAttribute('data-theme', theme);
  el.style.backgroundColor = SURFACE[theme].bg;
  el.style.color = SURFACE[theme].fg;
}

export const useThemeStore = create<{
  theme: AdminTheme;
  setTheme: (t: AdminTheme) => void;
  toggleTheme: () => void;
}>()(
  persist(
    (set, get) => ({
      // Light, matching what the admin has rendered since the toggle was
      // disabled and what ThemeInitScript falls back to. Defaulting to dark
      // here would make the store disagree with the pre-paint script on a
      // first visit: the page paints light, then flips as soon as React mounts.
      theme: 'light',
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: AdminTheme = get().theme === 'light' ? 'dark' : 'light';
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: 'admin-theme',
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeClass(state.theme);
      },
    },
  ),
);
