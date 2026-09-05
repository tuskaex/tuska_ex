import {
  API_BASE_URL as ENV_API_BASE_URL,
  API_URL as ENV_API_URL,
  WS_URL as ENV_WS_URL,
} from '@env';

import { brand } from '../theme/brand';

// The gateway. Same API the web terminal and the admin back office talk to —
// there is one backend, and the SpeedTrade app is another client of it, not a
// separate deployment.
//
// This is a *fallback*. Real builds set API_BASE_URL in `.env` (locally) or as
// an EAS build secret, which is how a device build points at staging. The
// default exists so a fresh checkout runs without a .env file at all; it is
// not the configuration mechanism.
const DEFAULT_BASE = 'https://api.tuskaex.com';

function trimOrEmpty(v) {
  if (v == null || typeof v !== 'string') return '';
  return v.trim();
}

export const API_BASE_URL =
  trimOrEmpty(ENV_API_BASE_URL) || DEFAULT_BASE;

const baseNoSlash = API_BASE_URL.replace(/\/$/, '');

export const API_URL =
  trimOrEmpty(ENV_API_URL) || `${baseNoSlash}/api/v1`;

const derivedWs = API_BASE_URL.startsWith('https')
  ? API_BASE_URL.replace(/^https/, 'wss')
  : API_BASE_URL.replace(/^http/, 'ws');

export const WS_URL = trimOrEmpty(ENV_WS_URL) || derivedWs;

// Public web origin. The app itself never loads a page from here — the only
// use is absolute image URLs inside generated PDF/HTML exports (statements,
// trade receipts), which are rendered by expo-print and therefore need a URL a
// browser can fetch, not a bundled `require()`.
//
// There used to be a CHART_URL here too, pointing at a chart page on the web
// terminal. The chart is drawn natively now (features/markets/charts), so the
// app no longer loads any remote page for charting and the constant is gone.
export const TRADE_WEB_URL = brand.webOrigin;
