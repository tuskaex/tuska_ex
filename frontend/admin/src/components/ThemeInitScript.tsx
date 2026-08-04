import Script from 'next/script';

/*
 * Applies the saved theme before the first paint.
 *
 * This used to hard-code light and explicitly ignore the stored value —
 * "Admin runs in light mode only" — which left themeStore, both token blocks
 * in globals.css and Tailwind's darkMode:'class' all wired up but unreachable.
 * The toggle is back, so this reads the choice again.
 *
 * It runs beforeInteractive and reads localStorage directly rather than waiting
 * for zustand to rehydrate: the store only settles after React mounts, and by
 * then the page has already painted. A dark-mode user would get a white flash
 * on every navigation.
 *
 * Light is the fallback, not dark — that is what the admin has been rendering,
 * so anyone who has not touched the toggle sees no change at all.
 */
const INIT = `
(function(){
  try {
    var t = 'light';
    var raw = localStorage.getItem('admin-theme');
    if (raw) {
      // zustand/persist wraps the value: {"state":{"theme":"dark"},"version":0}
      var parsed = JSON.parse(raw);
      var saved = parsed && parsed.state && parsed.state.theme;
      if (saved === 'dark' || saved === 'light') t = saved;
    }
    var d = document.documentElement;
    d.classList.toggle('dark', t === 'dark');
    d.classList.toggle('light', t === 'light');
    d.setAttribute('data-theme', t);
    d.style.backgroundColor = t === 'dark' ? '#050707' : '#ffffff';
    d.style.color = t === 'dark' ? '#f0f0f0' : '#0a0a0a';
  } catch (e) {
    /* Private mode, blocked storage, corrupt JSON — fall through on light. */
  }
})();
`;

/** Runs before paint to match the persisted theme (zustand persist key: admin-theme). */
export default function ThemeInitScript() {
  return <Script id="admin-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: INIT }} />;
}
