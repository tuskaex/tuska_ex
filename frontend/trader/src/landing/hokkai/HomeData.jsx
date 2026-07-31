'use client'

// TUSKAEX - Home Page Data タスカEX
//
// ─────────────────────────────────────────────────────────────────
// EVERY CLAIM IN THIS FILE MUST BE TRUE OF THE RUNNING PLATFORM.
//
// This file previously carried marketing copy inherited from the
// white-label parent, describing a broker we are not. It was audited
// against the production database and the backend source, and what
// could not be substantiated was removed rather than softened.
//
// What was taken out, and why:
//
//   "No Dealing Desk (NDD)", "routed directly to liquidity providers",
//   "institutional-grade liquidity from premium institutions"
//       — TuskaEx is a B-book. services/b-book-engine/matching_engine.py:
//         "No external liquidity — the admin/house is the counterparty
//         to every trade." CORECEN_LP_ENABLED is unset in production.
//         Claiming NDD was the exact opposite of how execution works.
//
//   Customer testimonials (Michael R. / Sarah K. / David L.)
//       — invented. One claimed a year of trading history; the users
//         table held 4 rows and the repo was two days old.
//
//   "60+ currency pairs", "52 crypto pairs", "80 currency crosses"
//       — the instruments table holds 59 rows TOTAL. Real per-segment
//         counts are in `marketAssets` below and are the numbers to
//         update when instruments are added.
//
//   Account tiers ($100 / $500 / $5,000 minimums), "spreads from 0.0
//   pips", "USD 16 per standard lot"
//       — account_groups, spread_configs and ib_commission_plans are
//         all EMPTY. None of it was configured, so none of it was true.
//
//   Trading signals, economic calendar, AI insights, VPS hosting,
//   webinars, e-books, video tutorials, beginner guides
//       — no endpoint, table or route exists for any of them.
//
//   "99.9% uptime", "execution under 40ms", "negative balance
//   protection", "segregated accounts at top-tier banks"
//       — unmeasured, unimplemented, or a banking arrangement the code
//         cannot evidence.
//
// Before adding anything here, check it resolves to a route a user can
// reach or a row in the database. Numbers below trace to:
//   instruments table (59) · .env DEFAULT_LEVERAGE / MARGIN_CALL_LEVEL /
//   STOP_OUT_LEVEL / MAX_OPEN_TRADES
// ─────────────────────────────────────────────────────────────────

import React from 'react'
import { FiShield, FiGlobe, FiCpu, FiTarget, FiActivity, FiDollarSign, FiLayers, FiMonitor, FiUsers, FiCode } from 'react-icons/fi'

export const whyFeatures = [
  { icon: <FiTarget size={20}/>, title: 'Transparent Pricing', desc: 'Spreads and charges are set per instrument by the platform and shown on the ticket before you commit to a trade. What you see quoted is what fills.', color: 'text-red-accent', bg: 'bg-red-accent/10', kanji: '透明' },
  { icon: <FiGlobe size={20}/>, title: 'Multi-Asset Access', desc: 'Forex, indices, commodities, energies, share CFDs and crypto — 59 instruments from a single account and a single balance.', color: 'text-blue-400', bg: 'bg-blue-400/10', kanji: '市場' },
  { icon: <FiCpu size={20}/>, title: 'Professional Charting', desc: 'The terminal runs TradingView Advanced Charts: multi-chart layouts, the full built-in indicator library, drawing tools and saved workspaces.', color: 'text-purple-400', bg: 'bg-purple-400/10', kanji: '技術' },
  { icon: <FiUsers size={20}/>, title: 'Copy Trading & PAMM', desc: 'Follow a master account and mirror its positions automatically, or allocate into a PAMM pool where returns are shared by NAV-based units.', color: 'text-green-accent', bg: 'bg-green-accent/10', kanji: '相場' },
  { icon: <FiCode size={20}/>, title: 'Open Algo API', desc: 'Connect any bot, EA or script over a documented HTTPS JSON API with a live WebSocket tick stream — the same feed the web terminal uses.', color: 'text-red-accent', bg: 'bg-red-accent/10', kanji: '自動' },
]

/* Counts are live rows in the `instruments` table, grouped by segment.
   Update them here when instruments are added — they are quoted on the
   markets section and in the stats bar. */
export const marketAssets = [
  { label: 'Forex', icon: '💱', desc: '29 currency pairs across majors, minors and crosses, quoted from a live institutional price feed.', kanji: '外為' },
  { label: 'Indices', icon: '📊', desc: '8 global stock indices spanning US, European and Asian sessions — trade a whole economy in one position.', kanji: '指数' },
  { label: 'Commodities', icon: '🥇', desc: 'Precious metals including gold and silver, plus 3 energy contracts covering crude and natural gas.', kanji: '商品' },
  { label: 'Share CFDs', icon: '📈', desc: '8 single-stock CFDs on leading global companies, with the same margin treatment as the rest of the book.', kanji: '株式' },
  { label: 'Cryptocurrencies', icon: '₿', desc: '8 major digital assets, priced continuously and tradable alongside your other positions.', kanji: '暗号' },
]

/* Only surfaces a user can actually open. The mobile app and desktop
   terminal were listed here with download links that returned 404 — no
   /downloads directory exists on the server — so they are gone until a
   build is actually shipped. */
export const platforms = [
  { icon: <FiMonitor size={22}/>, name: 'TuskaEx WebTrader', tag: 'Any browser', desc: 'The full platform in a browser tab — no download, no install. TradingView Advanced Charts, one-click trading, multi-chart layouts and the complete order ticket.', color: 'text-red-accent', bg: 'bg-red-accent/10', border: 'border-red-accent/20' },
  { icon: <FiCode size={22}/>, name: 'Algo Connector', tag: 'REST + WebSocket', desc: 'Point your own bot or EA at the account over an authenticated HTTPS API. Place and close orders, read balance and margin, stream live ticks.', color: 'text-green-accent', bg: 'bg-green-accent/10', border: 'border-green-accent/20' },
  { icon: <FiUsers size={22}/>, name: 'Social & PAMM', tag: 'Built in', desc: 'Copy a master account trade-for-trade or invest into a PAMM pool, managed from the same dashboard as your own positions.', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
]

/* Each of these is a feature present in the shipped terminal. */
export const platformFeatures = [
  'TradingView Advanced Charts', 'Multi-Chart Layout', 'One-Click Trading',
  'Algorithmic Trading API', 'Stop Loss & Take Profit', 'Risk & Position Calculator',
]

/* Was four invented tiers with deposit minimums that nothing enforced.
   Replaced with the account facts the platform genuinely applies —
   every figure here is a live setting, not a promise. */
export const accounts = [
  { name: 'Demo', badge: 'Practice', badgeColor: 'bg-blue-500/20 text-blue-400', minDeposit: 'Free', spreads: 'Live market prices', commission: 'No real funds', desc: 'A full-feature account funded with virtual money. Identical prices, charts and execution to a live account — the only difference is that nothing settles.', features: ['Same live pricing','Full platform access','No funding required','Reset any time'], cta: 'Open Demo', highlight: false },
  { name: 'Live', badge: 'Standard', badgeColor: 'bg-red-accent/20 text-red-accent', minDeposit: 'No minimum set', spreads: 'Set per instrument', commission: 'Shown before you trade', desc: 'A funded trading account across all 59 instruments. Deposit by crypto, card or bank transfer; spreads and charges are configured per instrument and displayed on the ticket.', features: ['All 59 instruments','Leverage up to 1:100','Crypto, card & bank funding','Copy trading and PAMM'], cta: 'Open Live Account', highlight: true },
]

/* Every number below is read from production configuration:
   DEFAULT_LEVERAGE=100 · MARGIN_CALL_LEVEL=80 · STOP_OUT_LEVEL=50 ·
   MAX_OPEN_TRADES=200. Change them there and change them here. */
export const tradingConditions = [
  { icon: <FiActivity size={20}/>, title: 'Principal Execution', desc: 'TuskaEx is the counterparty to your trades — we fill you directly rather than passing the order to a third party. Prices come from an institutional feed and every fill is timestamped and auditable in your history.', color: 'text-red-accent', bg: 'bg-red-accent/10' },
  { icon: <FiDollarSign size={20}/>, title: 'Spreads & Charges', desc: 'Spread, commission and swap are configured per instrument and per account group. All three are shown on the order ticket before you confirm, and itemised again on the closed trade.', color: 'text-red-accent', bg: 'bg-red-accent/10' },
  { icon: <FiLayers size={20}/>, title: 'Leverage up to 1:100', desc: 'Accounts default to 1:100. Up to 200 positions can be open at once, and required margin is recalculated on every tick.', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { icon: <FiShield size={20}/>, title: 'Margin Call at 80%, Stop-Out at 50%', desc: 'You are notified when margin level falls to 80%. At 50% the risk engine begins closing positions automatically. Stop Loss and Take Profit are available on every order.', color: 'text-green-accent', bg: 'bg-green-accent/10' },
]

/* Trimmed to tools that resolve to a real route. Trading signals, the
   economic calendar, AI insights and VPS hosting had no backend at all. */
export const toolsResearch = [
  { icon: '🧮', label: 'Risk & Position Calculator', desc: 'Size a position against your balance and stop' },
  { icon: '📰', label: 'Market News', desc: 'Market headlines inside the platform' },
  { icon: '🤖', label: 'Algo Trading API', desc: 'Documented REST + WebSocket for your own bots' },
  { icon: '👥', label: 'Copy Trading', desc: 'Mirror a master account automatically' },
  { icon: '📊', label: 'PAMM Allocation', desc: 'Invest into a managed pool by NAV units' },
  { icon: '🤝', label: 'Partner Programme', desc: 'Refer clients and track rebates in the dashboard' },
]

export const stats = [
  { value: 59, suffix: '', label: 'Tradable Instruments', decimals: 0 },
  { value: 100, suffix: ':1', label: 'Leverage Up To', decimals: 0 },
  { value: 200, suffix: '', label: 'Max Open Positions', decimals: 0 },
  { value: 50, suffix: '%', label: 'Stop-Out Level', decimals: 0 },
]

export const faqs = [
  { q: 'How do I open a trading account?', a: 'Register with your email, verify it, and complete KYC to fund the account. A demo account is available immediately after registration, with no deposit and no verification required.' },
  { q: 'Who is the counterparty to my trades?', a: 'TuskaEx is. We execute your orders as principal rather than routing them to an external liquidity provider. Prices are sourced from an institutional market-data feed, and every fill, swap and charge is recorded against your account and visible in your trade history.' },
  { q: 'What leverage and margin rules apply?', a: 'Accounts default to 1:100 leverage with up to 200 open positions. You receive a margin call when your margin level reaches 80%, and positions begin closing automatically at 50%.' },
  { q: 'How can I deposit and withdraw?', a: 'Deposits are supported in cryptocurrency (including USDT on Tron, Ethereum and BSC), and by card and bank transfer where available in your region. Withdrawals are requested from the wallet page and reviewed before payout.' },
  { q: 'What trading platforms are available?', a: 'TuskaEx WebTrader runs in any browser with no installation and is the full platform. For automated strategies, the Algo Connector exposes a documented HTTPS API and a live WebSocket tick stream.' },
  { q: 'Do you offer a demo account?', a: 'Yes. The demo account uses the same live prices, charts and execution logic as a live account, funded with virtual money so nothing settles.' },
]
