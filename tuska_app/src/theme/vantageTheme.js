import { Platform } from 'react-native';

// ── Theme token sets ────────────────────────────────────────────────────────
// Two palettes share the same key names so every component can keep reading
// `vantage.<token>` unchanged. The active set is applied into the live `vantage`
// object at startup (before screens load) by applyVantageTheme().

// ── SpeedTrade palette ──────────────────────────────────────────────────────
// Ported from the marketing site's tokens (speedtrade_landing/src/styles/
// globals.css) so the app and the website are visibly the same product.
//
// The site's rule carries over verbatim: **blue does the work, red is the
// spark**. `accent` (#1b4dff) drives every button, link and active state;
// `spark` (#ff3b2f) is reserved for the logo mark, live dots and badges and
// should never cover a large area. The one sanctioned exception is the Sell
// button, where red is not decoration — it is the direction of the trade.
//
// The site is light-first and this app is dark-first, so the dark set is not a
// mechanical inversion: on the ink ground the site's `--up`/`--down` are too
// dark to read, so both are lifted. On the light set they go the other way,
// to the site's own text-safe `--up-ink`/`--down-ink`, because in this app
// those colours are mostly *text* (a P&L figure) rather than a fill. Use
// `upFill`/`downFill` for anything that is a shape — a candle body, a bar, a
// flash — where the vivid version is correct in both themes.

const darkTokens = {
  // Surfaces — the site's ink navy (#0a0e17), stepped up rather than pure
  // black, so cards separate from the ground without needing a border.
  bg:           '#0A0E17',
  bgElevated:   '#121826',
  bgRaised:     '#1A2233',
  bgPressed:    '#232D42',
  border:       '#1E2739',
  borderStrong: '#2C3850',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#9AA6BF',
  textMuted:     '#6B7794',
  textInverse:   '#0A0E17',

  // Brand
  accent:       '#1B4DFF',
  accentGlow:   '#5C82FF',
  accentMuted:  'rgba(27,77,255,0.16)',
  spark:        '#FF3B2F',
  sparkMuted:   'rgba(255,59,47,0.16)',

  // Directionals — lifted off the site values for legibility on ink.
  up:           '#00D18F',
  upMuted:      'rgba(0,209,143,0.12)',
  upFill:       '#00A76F',
  down:         '#FF5647',
  downMuted:    'rgba(255,86,71,0.12)',
  downFill:     '#E5372A',

  // Trade-screen specific — Sell red, Buy on a neutral raised surface.
  sellBg:       '#E5372A',
  buyBg:        '#1A2233',
  spreadChip:   '#0A0E17',

  // Sell/Buy action buttons.
  sellBtn:      '#E5372A',
  sellBtnDim:   'rgba(229,55,42,0.30)',
  buyBtn:       '#00A76F',
  buyBtnDim:    'rgba(0,167,111,0.30)',
};

const lightTokens = {
  // Surfaces — the site's paper/canvas/line trio.
  bg:           '#FFFFFF',
  bgElevated:   '#F6F8FB',
  bgRaised:     '#EDF1F7',
  bgPressed:    '#E1E7F0',
  border:       '#E4E8EF',
  borderStrong: '#CBD3E1',

  // Text — the site's ink and ink-soft.
  textPrimary:   '#0A0E17',
  textSecondary: '#5A6376',
  textMuted:     '#8B93A5',
  textInverse:   '#FFFFFF',

  // Brand — same blue in both themes; `accentGlow` is the site's pressed state.
  accent:       '#1B4DFF',
  accentGlow:   '#0B2ECC',
  accentMuted:  'rgba(27,77,255,0.10)',
  spark:        '#C21F14',
  sparkMuted:   'rgba(255,59,47,0.10)',

  // Directionals — text-safe on white and on their own tint.
  up:           '#00734C',
  upMuted:      'rgba(0,167,111,0.12)',
  upFill:       '#00A76F',
  down:         '#B02318',
  downMuted:    'rgba(229,55,42,0.12)',
  downFill:     '#E5372A',

  // Trade-screen specific
  sellBg:       '#E5372A',
  buyBg:        '#EDF1F7',
  spreadChip:   '#FFFFFF',

  sellBtn:      '#E5372A',
  sellBtnDim:   'rgba(229,55,42,0.18)',
  buyBtn:       '#00A76F',
  buyBtnDim:    'rgba(0,167,111,0.18)',
};

export const VANTAGE_TOKENS = { dark: darkTokens, light: lightTokens };

// Live token object. Components import this and read `vantage.<token>`. It is
// MUTATED in place (never reassigned) so existing destructured imports keep
// pointing at the up-to-date values. Defaults to dark; applyVantageTheme()
// overrides it at startup based on the saved preference.
export const vantage = { ...darkTokens, scheme: 'dark', isDark: true };

/** Swap the live tokens to the named theme ('dark' | 'light'). */
export function applyVantageTheme(name) {
  const isDark = name !== 'light';
  Object.assign(vantage, isDark ? darkTokens : lightTokens, {
    scheme: isDark ? 'dark' : 'light',
    isDark,
  });
  return vantage;
}

// SecureStore key used across the app for the theme preference.
export const THEME_PREF_KEY = 'themeMode';

export const fontFamily = Platform.select({ ios: 'System', android: 'Roboto' });

export const weights = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
};

export const sizes = {
  hero:  28,
  h1:    22,
  h2:    18,
  h3:    15,
  body:  14,
  label: 12,
  micro: 10,
};

export const space = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 48,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 999,
};

export default {
  vantage,
  applyVantageTheme,
  fontFamily,
  weights,
  sizes,
  space,
  radius,
};
