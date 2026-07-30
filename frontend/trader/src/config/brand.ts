/**
 * Brand constants — single source of truth for white-label values.
 *
 * To rebrand the entire app, swap these five strings. Everything that
 * imports from here (page titles, footer, wordmark, support links,
 * copyright) follows automatically.
 */

export const BRAND_NAME = 'TuskaEx';
// Horizontal lockup (mark + wordmark), transparent background, 704x192.
// This is the same asset the marketing Navbar and LandingFooter render;
// keep them in sync. The square mark alone lives at
// /marketing/tuskaex_fevicon.png.
export const BRAND_LOGO = '/marketing/tuskaex-logo.png';
export const BRAND_DOMAIN = 'tuskaex.com';
export const BRAND_SUPPORT_EMAIL = 'support@tuskaex.com';
export const BRAND_COPYRIGHT = `${BRAND_NAME} © ${new Date().getFullYear()}. All rights reserved.`;

/** Zustand persist key for UI preferences (theme, terminal layout). */
export const STORAGE_KEY_UI = 'tuskaex-ui';
