'use client';

import { useEffect, useState } from 'react';
import { isTenantAdminHost } from '@/lib/tenantBrand';

/**
 * Re-colours a sub-broker's admin panel in their admin colour.
 *
 * The platform red is compiled into the stylesheets as literal values
 * (`accent` #D60101 and its shades, `bg-[#…]` utilities, globals.css), so this
 * reads the loaded stylesheets, finds every declaration using one of those
 * accent shades, and appends the same selector with the broker's shade of it — the
 * same technique the trader app's TenantThemeColor uses. TuskaEx's own admin
 * host is never touched.
 */

type RGB = [number, number, number];

/** Each shade of the platform's brand red, and how far to move the tenant
 *  colour to play its role: positive mixes toward white (tints), negative
 *  toward black (hover/pressed). Only the accent family is listed; the
 *  sell / danger reds (#DC2626, #EF4444, …) convey trade direction and
 *  status, so they keep their colour under every brand. */
const PLATFORM_ACCENTS: { rgb: RGB; mix: number }[] = [
  { rgb: [214, 1, 1], mix: 0 }, //      #D60101  base
  { rgb: [163, 0, 0], mix: -0.24 }, //  #A30000  hover / dark
  { rgb: [241, 74, 74], mix: 0.29 }, // #F14A4A  light
  { rgb: [253, 227, 227], mix: 0.89 }, // #FDE3E3  soft background
];

const STYLE_ID = 'admin-theme-color';

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
  for (const { rgb, mix } of PLATFORM_ACCENTS) {
    const to = shade(base, mix);
    byTriplet.set(rgb.join(','), to);
    byHex.set(toHex(rgb).toLowerCase(), toHex(to));
  }
  const rgbRe = /(rgba?\(\s*)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})(\s*,\s*|\s+)(\d{1,3})/gi;
  const hexRe = /#([0-9a-f]{6})\b/gi;
  return (value: string): string =>
    value
      .replace(rgbRe, (all, open: string, r: string, s1: string, g: string, s2: string, b: string) => {
        const to = byTriplet.get(`${r},${g},${b}`);
        return to ? `${open}${to[0]}${s1}${to[1]}${s2}${to[2]}` : all;
      })
      .replace(hexRe, (all, h: string) => byHex.get(`#${h.toLowerCase()}`) ?? all);
}

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

export default function AdminThemeColor() {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!isTenantAdminHost()) return;
    let cancelled = false;
    void fetch('/brand/info', { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { admin_color?: string | null } | null) => {
        if (!cancelled) setColor(d?.admin_color ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!color) return;
    const base = hexToRgb(color);
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
  }, [color]);

  return null;
}
