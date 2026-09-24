'use client';

import { create } from 'zustand';
import api from '@/lib/api/client';
import { getErrorStatus } from '@/lib/errors';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * User shape returned by `GET /auth/me`. Wallet-related fields
 * (wallet_address, wallet_linked, is_wallet_placeholder) were removed
 * when the SIWE / wallet-link UX was retired — the backend may still
 * send them for legacy accounts, but the frontend no longer reads or
 * exposes them anywhere.
 */
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  date_of_birth?: string | null;
  role: string;
  status: string;
  kyc_status: string;
  is_demo?: boolean;
  two_factor_enabled: boolean;
  theme: string;
  /** True when first_name, last_name, phone, country, and DOB are all set.
   * The ProfileCompleteGate modal blocks the app until this flips true. */
  profile_complete?: boolean;
  /** Sign-in methods the user has on record. Used so /profile knows
   * which auth methods to allow unlinking. */
  has_password?: boolean;
  has_google?: boolean;
  /** OnboardingGate inputs — profile + email verification. The wallet
   * leg of onboarding was removed with the SIWE feature retirement. */
  email_verified?: boolean;
  onboarding_complete?: boolean;
  /** @deprecated — SIWE wallet sign-in was retired; the server no
   * longer sends this field. Kept optional in the type so the dormant
   * wallet UI (LinkedWalletCard, OnChainWalletBalance,
   * WalletAccountMigrateBanner, the withdraw card in wallet/page.tsx)
   * still type-checks without needing a sweep-rewrite. At runtime the
   * field is always undefined and each call site falls through to its
   * "no wallet linked" branch. Delete this entry + the dormant
   * components in a follow-up purge. */
  wallet_address?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  googleLogin: (idToken: string, referralCode?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    referral_code?: string;
  }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setInitialized: (val: boolean) => void;
}

/*
 * Whether this browser has ever held a session on this domain.
 *
 * The session itself is HttpOnly cookies, which JavaScript cannot read — so
 * without this the app had no way to tell "signed in" from "never signed in"
 * except by asking the server. Every visitor to the marketing site therefore
 * got a GET /auth/me and, on its 401, a POST /auth/refresh, both guaranteed to
 * fail. Chrome logs a failed request as a console error whatever the caller
 * does with it, so the public landing page opened with four red errors in the
 * console. Nothing was broken; it simply looked it, which is its own problem on
 * a page whose job is to be trusted.
 *
 * This is a HINT, not a credential. It carries no identity, grants nothing, and
 * the server remains the only thing that decides whether a session is real. Its
 * only job is to stop the app asking a question it already knows the answer to.
 *
 * It self-heals in both directions: a stale hint costs one 401 and is cleared
 * on the spot, and a missing hint costs a signed-in user nothing because every
 * path that establishes a session sets it.
 */
const SESSION_HINT = 'tx_session';

function hasSessionHint(): boolean {
  try {
    return typeof window !== 'undefined' &&
           window.localStorage.getItem(SESSION_HINT) === '1';
  } catch {
    // Storage disabled (private mode, a locked-down profile). Assume there
    // might be a session: one needless 401 is a far smaller problem than a
    // signed-in trader being shown the logged-out site.
    return true;
  }
}

export function markSessionStarted(): void {
  try { window.localStorage.setItem(SESSION_HINT, '1'); } catch { /* no storage */ }
}

function clearSessionHint(): void {
  try { window.localStorage.removeItem(SESSION_HINT); } catch { /* no storage */ }
}

/*
 * The bootstrap runs from more than one place — AuthProvider on app routes and
 * the marketing Navbar, which deliberately sits outside it — and each one was
 * doing the whole /auth/me plus /auth/refresh dance of its own. That is what
 * doubled the console errors, and on a signed-in load it was two round trips
 * for one answer. Concurrent callers now share the first one's promise.
 */
let inFlightLoad: Promise<void> | null = null;

/** Session is HttpOnly cookies + optional refresh; Zustand holds UI state only (no secrets). */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  login: async (email, password, totpCode) => {
    set({ isLoading: true });
    try {
      await api.post<{ access_token: string; user_id: string; role: string }>('/auth/login', {
        email,
        password,
        totp_code: totpCode,
      });
      // The cookies exist from here on, so the next page load may ask about
      // them. Recorded at the POST rather than after the profile arrives: a
      // /auth/me that fails for some other reason must not leave a real
      // session looking like none.
      markSessionStarted();
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false, token: null });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  demoLogin: async () => {
    set({ isLoading: true });
    try {
      await api.post<{ access_token: string; user_id: string; role: string }>('/auth/demo-login', {});
      markSessionStarted();
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false, token: null });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  googleLogin: async (idToken, referralCode) => {
    set({ isLoading: true });
    // Stage 1: the sign-in itself. A failure here (bad token, blocked
    // account, origin reject) keeps the original status so the UI can show
    // "could not be verified" etc.
    try {
      await api.post<{ access_token: string; user_id: string; role: string }>('/auth/google', {
        id_token: idToken,
        referral_code: referralCode,
      });
      markSessionStarted();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
    // Stage 2: the sign-in succeeded — cookies are set and the new-login
    // email has fired. Now load the profile. On Safari (and Chrome under
    // strict cookie / FedCM redirects) the very next request can 401
    // because the Set-Cookie hasn't been applied to the cookie jar yet.
    // Retry with the refresh cookie path before declaring failure, and
    // when we *do* fail, tag the error so the UI doesn't show the
    // "could not be verified" message — the user IS signed in.
    try {
      let user: User;
      try {
        user = await api.get<User>('/auth/me');
      } catch (e: unknown) {
        const status = (e as { status?: number })?.status;
        if (status !== 401) throw e;
        // Short pause to let the cookie write settle, then try the
        // refresh-cookie path (same flow loadUser() uses on cold start).
        await new Promise((r) => setTimeout(r, 250));
        try {
          await api.post('/auth/refresh', {});
        } catch { /* refresh may already be fresh — ignore and retry /me */ }
        user = await api.get<User>('/auth/me');
      }
      set({ user, isAuthenticated: true, isLoading: false, token: null });
    } catch (e) {
      set({ isLoading: false });
      const err = new Error(
        'Signed in, but profile failed to load. Please refresh the page.',
      );
      (err as { status?: number; profileLoadFailed?: boolean }).status = 0;
      (err as { profileLoadFailed?: boolean }).profileLoadFailed = true;
      throw err;
    }
  },

  forgotPassword: async (email) => {
    await api.post<{ message: string }>('/auth/forgot-password', { email });
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      await api.post<{ access_token: string }>('/auth/register', data);
      markSessionStarted();
      const user = await api.get<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false, token: null });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: () => {
    void (async () => {
      try {
        await api.post('/auth/logout', {});
      } catch {
        /* ignore — still clear client */
      }
      api.clearToken();
      clearSessionHint();
      useNotificationStore.getState().reset();
      set({ user: null, token: null, isAuthenticated: false });
    })();
  },

  loadUser: async () => {
    // A visitor who has never signed in on this browser has nothing to load.
    // Asking anyway is two requests that can only 401, and Chrome prints both
    // in the console — see SESSION_HINT.
    if (!hasSessionHint()) {
      set({ user: null, isAuthenticated: false, isInitialized: true, token: null });
      return;
    }
    // One bootstrap per page load, however many components ask for it.
    if (inFlightLoad) return inFlightLoad;

    const fetchMe = () => api.get<User>('/auth/me');
    inFlightLoad = (async () => {
      try {
        const user = await fetchMe();
        markSessionStarted();
        set({ user, isAuthenticated: true, isInitialized: true, token: null });
      } catch (e: unknown) {
        // Only try refresh if it was an auth error (401)
        const status = getErrorStatus(e);
        if (status === 401 || status === 403) {
          try {
            await api.post('/auth/refresh', {});
            const user = await fetchMe();
            markSessionStarted();
            set({ user, isAuthenticated: true, isInitialized: true, token: null });
            return;
          } catch { /* fall through */ }
        }
        // The session is gone, or there never was one. Drop the hint so the
        // next page load is silent instead of repeating this every time.
        clearSessionHint();
        set({ user: null, isAuthenticated: false, isInitialized: true, token: null });
        api.clearToken();
      } finally {
        // Cleared whatever happened, so a later loadUser() — after a sign-in,
        // or the handoff redeem — is a real attempt and not this result again.
        inFlightLoad = null;
      }
    })();
    return inFlightLoad;
  },

  refreshUser: async () => {
    try {
      const user = await api.get<User>('/auth/me');
      // Every path that signs someone in without going through login() ends
      // here — the sign-up OTP step and the no-verification sign-up both do —
      // so this is the one place that catches all of them.
      markSessionStarted();
      set({ user, isAuthenticated: true });
    } catch {
      /* swallow — leave existing state untouched */
    }
  },

  setInitialized: (val) => set({ isInitialized: val }),
}));
