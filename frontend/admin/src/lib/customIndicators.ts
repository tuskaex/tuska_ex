/**
 * Builds Charting Library custom indicators from converted rows. Same builder
 * as frontend/trader/src/lib/chart/customIndicators.ts and
 * desk_terminal/web/tx_indicators.js — the preview must run the code exactly
 * the way traders' terminals will. Keep the three in step.
 */

export interface CustomIndicatorRow {
  study_id: string;
  name: string;
  js: string;
}

export function buildCustomIndicators(
  PineJS: unknown,
  rows: CustomIndicatorRow[],
  onError?: (row: CustomIndicatorRow, e: unknown) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
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
      ind.name = row.name;
      ind.metainfo.id = `${row.study_id}@tv-basicstudies-1`;
      ind.metainfo.description = row.name;
      ind.metainfo.shortDescription = ind.metainfo.shortDescription || row.name;
      ind.metainfo.isCustomIndicator = true;
      ind.metainfo._metainfoVersion = ind.metainfo._metainfoVersion || 53;
      out.push(ind);
    } catch (e) {
      console.warn(`[chart] custom indicator "${row.name}" skipped:`, e);
      onError?.(row, e);
    }
  }
  return out;
}
