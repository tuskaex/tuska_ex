/**
 * Single source of truth for who this app belongs to.
 *
 * This app is a white-label build. It shipped as SwissCresta and the brand
 * name, the support address and five logo files were spelled out inline in
 * roughly twenty screens — which is why rebranding it meant a grep across the
 * whole tree and hoping nothing was missed. Everything brand-shaped now lives
 * here, so the next rebrand is this file plus `assets/brand/`.
 *
 * Rules for anything added below:
 *   • No screen imports an image from `assets/brand/` directly. Use
 *     `brandAssets.*` — React Native resolves `require()` at bundle time, so
 *     the path has to be a literal and this is the one place it is written.
 *   • Anything a user can read (app name, support email, legal entity) goes
 *     here, not into a string in a component.
 *   • Colours do NOT live here — they are theme tokens in `vantageTheme.js`,
 *     because they differ between light and dark and this file does not.
 */

export const brand = {
  /** Display name. Used in notification titles, PDF exports, alerts. */
  name: 'SpeedTrade',
  /** Legal entity, for documents and policy screens. */
  legalName: 'SpeedTrade',
  /** Marketing site — the "about"/"visit us" link target. */
  site: 'https://speedtrade.tech',
  /** Public web app origin (used for brand assets in exported PDFs). */
  webOrigin: 'https://speedtrade.tech',
  /** Where "contact support" mail goes when a ticket is not appropriate. */
  supportEmail: 'support@speedtrade.tech',

  /**
   * The reverse-DNS app id. Kept here as documentation only — the value that
   * actually ships is in `app.json` (`ios.bundleIdentifier` / `android.package`),
   * which is read by the native build long before any JS runs. If you change
   * one, change the other.
   */
  appId: 'tech.speedtrade.app',
};

/**
 * Every brand image, resolved once.
 *
 * `icon` and `adaptiveIcon` are deliberately absent: they are referenced by
 * path from `app.json` and consumed by the native build, never by JS.
 */
export const brandAssets = {
  /** Wide wordmark, transparent. Splash, auth screens, light-theme lock screen. */
  logo: require('../../assets/brand/speedtrade-logo.png'),
  /** Square monogram, transparent, brand colours. Dark-theme lock screen. */
  monogram: require('../../assets/brand/speedtrade-favicon.png'),
  /** Square monogram in brand colours — for light surfaces (tab bar, light theme). */
  markOnLight: require('../../assets/brand/speedtrade-homebar.png'),
  /** Square monogram as a white cut-out — for dark surfaces (tab bar). */
  markOnDark: require('../../assets/brand/speedtrade-homebar-white.png'),
  /**
   * The same white monogram with NO square padding. Use this wherever the
   * slot is wide and short: `contain` inside a wide box fits a square asset
   * by its height and leaves the width empty, which shrinks the mark to a
   * fraction of the space it was given.
   */
  markWide: require('../../assets/brand/speedtrade-mark-white.png'),
};

export default brand;
