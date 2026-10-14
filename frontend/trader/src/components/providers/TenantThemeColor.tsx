'use client';

import { useEffect } from 'react';
import { useTenantBrand } from '@/hooks/useTenantBrand';

/**
 * Re-colours the app in a white-label tenant's theme colour.
 *
 * The platform blue is not one token: it is ~700 literal values across the
 * app (`bg-[#2563EB]`, `hover:bg-[#1D4ED8]`, `text-[#3B82F6]/60`, the Tailwind
 * `accent` palette, the `--accent` CSS variables…). Rather than thread a
 * variable through all of them, this reads the stylesheets the page actually
 * loaded, finds every declaration that uses one of the platform blues, and
 * appends the same selector with the tenant's shade of it. Same selector,
 * later in the document, same !important flag — so it wins exactly where the
 * original applied and nowhere else, opacity variants included.
 *
 * Runs only on a tenant host with a colour set; TradesX's own hosts never
 * mount the effect's work. Inline `style={{ color: '#2563EB' }}` and SVG fill
 * attributes are not stylesheet rules and keep the platform blue.
 */

type RGB = [number, number, number];

/** Each platform blue, and how far to move the tenant colour to play its role:
 *  positive mixes toward white (tints), negative toward black (hover/pressed). */
const PLATFORM_BLUES: { rgb: RGB; mix: number }[] = [
  { rgb: [37, 99, 235], mix: 0 }, //    #2563EB  base
  { rgb: [29, 78, 216], mix: -0.15 }, // #1D4ED8  hover
  { rgb: [30, 64, 175], mix: -0.3 }, //  #1E40AF
  { rgb: [30, 58, 138], mix: -0.42 }, // #1E3A8A
  { rgb: [59, 130, 246], mix: 0.12 }, // #3B82F6
  { rgb: [96, 165, 250], mix: 0.3 }, //  #60A5FA
  { rgb: [147, 197, 253], mix: 0.5 }, // #93C5FD
  { rgb: [191, 219, 254], mix: 0.7 }, // #BFDBFE
  { rgb: [219, 234, 254], mix: 0.82 }, // #DBEAFE
  { rgb: [239, 246, 255], mix: 0.92 }, // #EFF6FF
];

const STYLE_ID = 'tenant-theme-color';

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1] as string, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade([r, g, b]: RGB, mix: number): RGB {
  const t = mix >= 0 ? 255 : 0;
  const k = Math.abs(mix);
  return [r, g, b].map((c) => Math.round(c + (t - c) * k)) as RGB;
}

function toHex(rgb: RGB): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function buildRewriter(base: RGB) {
  const byTriplet = new Map<string, RGB>();
  const byHex = new Map<string, string>();
  for (const { rgb, mix } of PLATFORM_BLUES) {
    const to = shade(base, mix);
    byTriplet.set(rgb.join(','), to);
    byHex.set(toHex(rgb).toLowerCase(), toHex(to));
  }
  // rgb(37, 99, 235) | rgb(37 99 235 / .5) | rgba(37,99,235,0.1) — keep the
  // separators and whatever follows (alpha, var()) untouched.
  const rgbRe = /(rgba?\(\s*)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})/gi;
  const hexRe = /#([0-9a-f]{6})\b/gi;
  return (value: string): string =>
    value
      .replace(rgbRe, (all, open: string, r: string, s1: string, g: string, s2: string, b: string) => {
        const to = byTriplet.get(`${r},${g},${b}`);
        return to ? `${open}${to[0]}${s1}${to[1]}${s2}${to[2]}` : all;
      })
      .replace(hexRe, (all, h: string) => byHex.get(h.toLowerCase()) ?? all);
}

/** Override CSS for every rule that uses a platform blue, keeping the at-rule
 *  (media / supports) context the original sat in. */
function collectOverrides(rewrite: (v: string) => string): string {
  const out: string[] = [];

  const walk = (rules: CSSRuleList): string[] => {
    const chunk: string[] = [];
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const decls: string[] = [];
        const st = rule.style;
        for (let i = 0; i < st.length; i++) {
          const prop = st.item(i);
          const val = st.getPropertyValue(prop);
          const next = rewrite(val);
          if (next !== val) {
            const imp = st.getPropertyPriority(prop) ? ' !important' : '';
            decls.push(`${prop}:${next}${imp}`);
          }
        }
        if (decls.length) chunk.push(`${rule.selectorText}{${decls.join(';')}}`);
      } else if (rule instanceof CSSMediaRule) {
        const inner = walk(rule.cssRules);
        if (inner.length) chunk.push(`@media ${rule.conditionText}{${inner.join('')}}`);
      } else if (typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule) {
        const inner = walk(rule.cssRules);
        if (inner.length) chunk.push(`@supports ${rule.conditionText}{${inner.join('')}}`);
      }
    }
    return chunk;
  };

  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as Element | null)?.id === STYLE_ID) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules; // throws for cross-origin sheets (e.g. fonts)
    } catch {
      continue;
    }
    out.push(...walk(rules));
  }
  return out.join('\n');
}

export default function TenantThemeColor() {
  const { isTenant, brandColor } = useTenantBrand();

  useEffect(() => {
    if (!isTenant || !brandColor) return;
    const base = hexToRgb(brandColor);
    if (!base) return;
    const rewrite = buildRewriter(base);

    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
    }
    const style = el;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      style.textContent = collectOverrides(rewrite);
      // Always last in <head>, so equal-specificity overrides win on order.
      document.head.appendChild(style);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(apply, 50);
    };

    apply();
    // Next.js adds route CSS as you navigate; re-scan when a sheet arrives.
    const onLoad = (e: Event) => {
      if ((e.target as Element | null)?.tagName === 'LINK') schedule();
    };
    document.addEventListener('load', onLoad, true);
    const mo = new MutationObserver((muts) => {
      if (muts.some((m) => Array.from(m.addedNodes).some(
        (n) => n !== style && (n.nodeName === 'STYLE' || n.nodeName === 'LINK'),
      ))) schedule();
    });
    mo.observe(document.head, { childList: true });

    return () => {
      clearTimeout(timer);
      mo.disconnect();
      document.removeEventListener('load', onLoad, true);
      style.remove();
    };
  }, [isTenant, brandColor]);

  return null;
}
