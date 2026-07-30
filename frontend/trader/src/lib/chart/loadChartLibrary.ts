'use client';

/**
 * Loads the self-hosted TradingView Charting Library standalone bundle once
 * and resolves when `window.TradingView` is available. Shared by the inline
 * terminal chart and the /chart page so the load logic lives in one place.
 */

const LIBRARY_SRC = '/charting_library/charting_library.standalone.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView?: any;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadChartLibrary(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.TradingView) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LIBRARY_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('library load error')));
      return;
    }
    const s = document.createElement('script');
    s.src = LIBRARY_SRC;
    s.async = true;
    s.onload = () => {
      // A `load` event is not proof the bundle is really there. When the
      // file is absent, Next's catch-all can answer with an HTML page and
      // some paths still fire `load` rather than `error`; the script then
      // never defines window.TradingView and the caller would sit waiting
      // on a resolved promise for an API that does not exist. Treat a
      // missing global as a load failure so the caller can say so.
      if (!window.TradingView) {
        loadPromise = null; // allow retry once the bundle is installed
        reject(new Error('charting library loaded but window.TradingView is undefined'));
        return;
      }
      resolve();
    };
    s.onerror = () => {
      loadPromise = null; // allow retry
      reject(new Error('Failed to load charting library'));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}
