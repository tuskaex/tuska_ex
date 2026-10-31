/**
 * Custom indicators published from Admin → Indicators (pasted Pine Script /
 * MQL, converted server-side into Charting Library custom-indicator JS).
 *
 * Each row's `js` is the body of `function (PineJS) { ... }` that returns
 * `{ name, metainfo, constructor }`. The admin API parsed and checked it before
 * publishing; here it is run in strict mode, and one broken row is skipped
 * instead of taking the chart down with it.
 *
 * desk_terminal/web/tx_indicators.js and the admin preview carry the same
 * builder; keep the three in step.
 */

export interface CustomIndicatorRow {
  study_id: string;
  name: string;
  version: number;
  js: string;
}

export async function fetchCustomIndicators(): Promise<CustomIndicatorRow[]> {
  try {
    const r = await fetch('/api/v1/indicators', { credentials: 'include' });
    if (!r.ok) return [];
    const body = await r.json();
    return Array.isArray(body?.indicators) ? body.indicators : [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildCustomIndicators(PineJS: unknown, rows: CustomIndicatorRow[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const row of rows) {
    try {
      // eslint-disable-next-line no-new-func
      const factory = new Function('PineJS', '"use strict";\n' + row.js);
      const ind = factory.call(undefined, PineJS);
      if (!ind || typeof ind !== 'object' || !ind.metainfo
        || !Object.prototype.hasOwnProperty.call(ind, 'constructor')
        || typeof ind.constructor !== 'function') {
        throw new Error('factory did not return { name, metainfo, constructor }');
      }
      // The saved-layout identity comes from the row, never from the code.
      ind.name = row.name;
      ind.metainfo.id = `${row.study_id}@tv-basicstudies-1`;
      ind.metainfo.description = row.name;
      ind.metainfo.shortDescription = ind.metainfo.shortDescription || row.name;
      ind.metainfo.isCustomIndicator = true;
      ind.metainfo._metainfoVersion = ind.metainfo._metainfoVersion || 53;
      out.push(ind);
    } catch (e) {
      console.warn(`[chart] custom indicator "${row.name}" skipped:`, e);
    }
  }
  return out;
}
