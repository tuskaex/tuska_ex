'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { crmUrl, isCrossOrigin } from '@/lib/terminalHandoff';
import { LayoutGrid, LogOut, Moon, Sun } from 'lucide-react';
import { BrandMark, platformBrandName } from '@/components/layout/TuskaExWordmark';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

/**
 * The brand mark at the top of the terminal's left rail, and the menu it opens.
 *
 * It used to be a bare link to /accounts, which meant the terminal had no way
 * to switch theme or sign out at all: the terminal replaces AppNavbar with its
 * own chrome, and the navbar is where both of those live everywhere else. A
 * trader who opened the terminal was stuck there.
 *
 * The menu is rendered through a PORTAL, not positioned inside the rail. The
 * rail is 52px wide and its parent on the terminal page is `overflow-hidden`,
 * so an absolutely-positioned panel is clipped to a sliver — it looked like the
 * menu simply failed to open. Fixed coordinates off the button's own rect are
 * immune to whatever the ancestors do.
 */

/** Gap between the rail button and the panel. */
const GAP_PX = 8;
const MENU_WIDTH = 208;

export default function TerminalBrandMenu({ href = '/accounts' }: { href?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // The panel is portalled, so it must not be rendered during SSR.
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** When the backdrop last dismissed the menu — see `dismiss`. */
  const reopenGuardRef = useRef(0);

  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Open downward from the button's top edge, clamped so the panel can never
    // hang off the bottom of a short window.
    const top = Math.min(r.top, window.innerHeight - 210);
    const left = Math.min(r.right + GAP_PX, window.innerWidth - MENU_WIDTH - 8);
    setPos({ top: Math.max(8, top), left: Math.max(8, left) });
  }, []);

  // Measure before paint so the panel never appears at 0,0 and jumps.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    // Reposition rather than close: the terminal resizes panels constantly
    // (drag handles, collapsing the bottom blotter) and closing on every one of
    // those would feel like the menu kept dismissing itself.
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  /**
   * Dismiss when the click lands anywhere else.
   *
   * This is a real backdrop element rather than a `pointerdown` listener on
   * document, because the chart — the largest click target on this screen — is
   * an IFRAME. A click inside an iframe raises no event in the parent document
   * at all, in any phase, so a document listener simply never ran for it and
   * the menu sat open over the chart until Escape.
   */
  const dismiss = () => {
    setOpen(false);
    // The backdrop unmounts on pointerdown, so the browser then delivers the
    // `click` to whatever is underneath — and when that is the brand button,
    // its onClick would toggle the menu straight back open. Ignore the button
    // for one beat.
    reopenGuardRef.current = Date.now();
  };

  const isDark = theme === 'dark';
  const brandName = platformBrandName();

  /**
   * Leave for a CRM page, correct from whichever host the terminal is on.
   *
   * On the terminal domain nginx serves only the terminal — /accounts and
   * /auth/login both 404 there — so these have to cross to the CRM origin.
   * Everywhere else the same app owns them and this is a normal push.
   */
  const goCrm = (path: string) => {
    const url = crmUrl(path);
    if (!url) return;
    if (isCrossOrigin(url)) window.location.assign(url);
    else router.push(url);
  };

  const onSignOut = () => {
    setOpen(false);
    logout();
    /* Same tab, unlike the menu bar's CRM links: the session this button just
     * ended is the one the terminal behind it was using, so leaving the dead
     * terminal open in this tab is worse than replacing it. Falls back to the
     * terminal's own root when there is no CRM host to send them to. */
    const url = crmUrl('/auth/login');
    if (url && isCrossOrigin(url)) window.location.assign(url);
    else router.push(url ?? '/');
  };

  const rowCls =
    'flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-text-primary transition-colors hover:bg-bg-hover text-left';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (Date.now() - reopenGuardRef.current < 250) return;
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={brandName ? `${brandName} menu` : 'Menu'}
        title={brandName ? `${brandName} menu` : 'Menu'}
        className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-bg-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#D60101]"
      >
        <BrandMark />
      </button>

      {mounted && open && pos
        ? createPortal(
            <>
            {/* Transparent, and it covers the iframes too — that is the point. */}
            <div
              className="fixed inset-0 z-[99]"
              onPointerDown={dismiss}
              aria-hidden
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label={brandName ? `${brandName} menu` : 'Menu'}
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
              // z-index above the terminal's own layers (the chart overlay sits
              // at z-20 inside its container, the rail itself at z-5).
              className="fixed z-[100] rounded-xl border border-border-primary bg-bg-primary py-1 shadow-lg"
            >
              {user?.email ? (
                <div className="mb-1 border-b border-border-secondary px-3 pb-2 pt-2">
                  <div className="truncate text-[11.5px] text-text-tertiary">
                    {user.email}
                  </div>
                </div>
              ) : null}

              {/* Kept because this button replaced a plain link here — removing
                  the only route to the account list would be a regression. */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  goCrm(href);
                }}
                className={rowCls}
              >
                <LayoutGrid size={15} aria-hidden />
                <span>My accounts</span>
              </button>

              {/* Not aria-checked/menuitemcheckbox: this is a single control
                  that flips between two named states, and announcing "dark
                  mode, checked" is less clear than reading the action itself. */}
              <button
                type="button"
                role="menuitem"
                onClick={toggleTheme}
                className={rowCls}
              >
                {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
                <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
              </button>

              <div className="my-1 border-t border-border-secondary" />

              <button
                type="button"
                role="menuitem"
                onClick={onSignOut}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#DC2626] transition-colors hover:bg-[#FEE2E2]/50"
              >
                <LogOut size={15} aria-hidden />
                <span>Log out</span>
              </button>
            </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
