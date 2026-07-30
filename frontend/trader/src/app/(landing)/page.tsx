/**
 * TuskaEx marketing home — "Cyber-Samurai" landing.
 *
 * Ported from the standalone Hokkai Markets Vite site; the components
 * live in `src/landing/hokkai/`. The visual language — crimson
 * #e11d48, Michroma display type, Japanese kanji motifs — is kept
 * as-is; only the brand name was changed to TuskaEx.
 *
 * The previous Swistrade-derived landing is preserved next to this
 * file as `page.previous-landing.tsx.bak` — restoring it is a rename.
 *
 * This page renders inside `(landing)/layout.tsx`, which mounts the
 * shared marketing Navbar + Footer. `HokkaiHome` deliberately brings
 * no chrome of its own — on the standalone site the Navbar/Footer were
 * mounted at the router level, not inside the page.
 */

import HokkaiHome from '@/landing/hokkai/HokkaiHome'

export default function LandingHomePage() {
  return <HokkaiHome />
}
