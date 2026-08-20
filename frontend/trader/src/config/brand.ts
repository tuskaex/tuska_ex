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
// Same lockup recoloured for dark surfaces: the black brush ring and the
// "TUSKA" glyphs are white, while the red "T" mark and ".EX" are untouched.
// BRAND_LOGO is black-on-transparent, so on a dark background two thirds of
// it disappears and only the red fragments read. Use this wherever the
// backdrop is dark; regenerate it from BRAND_LOGO if the lockup changes.
export const BRAND_LOGO_LIGHT = '/marketing/tuskaex-logo-light.png';
/**
 * The trading terminal's own brand.
 *
 * The terminal is served from speedtrade.tech, a different product and a
 * different registrable domain from the TuskaEx CRM (see WEB_TERMINAL_API.md
 * §1). Someone looking at the chart there is inside SpeedTrade, so the chart's
 * exchange label and watermark say SpeedTrade — naming the parent platform in
 * that spot is simply the wrong company.
 *
 * This is deliberately separate from BRAND_NAME above: BRAND_NAME still drives
 * the CRM's page titles, footer and wordmark, and none of those move.
 *
 * A white-label tenant overrides both — see useChartBrand.
 */
export const TERMINAL_BRAND_NAME = 'SpeedTrade';
/** Mark + wordmark on transparent, so it reads on the light and dark chart. */
export const TERMINAL_BRAND_LOGO = '/marketing/speedtrade-logo.png';

export const BRAND_DOMAIN = 'tuskaex.com';
export const BRAND_SUPPORT_EMAIL = 'support@tuskaex.com';
export const BRAND_COPYRIGHT = `${BRAND_NAME} © ${new Date().getFullYear()}. All rights reserved.`;

/** Zustand persist key for UI preferences (theme, terminal layout). */
export const STORAGE_KEY_UI = 'tuskaex-ui';
