'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The platform's own red — what a tenant gets when no colour is set. */
export const DEFAULT_BRAND_COLOR = '#D60101';

const PRESETS: { name: string; hex: string }[] = [
  { name: 'TuskaEx red', hex: '#D60101' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Royal', hex: '#1D4ED8' },
  { name: 'Cyan', hex: '#0891B2' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Gold', hex: '#D97706' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Pink', hex: '#DB2777' },
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True for `#RGB` / `#RRGGBB`. The API applies the same rule and 400s otherwise. */
export function isValidHex(v: string): boolean {
  return HEX.test(v.trim());
}

/** `#RGB` → `#RRGGBB`, uppercase — what the native colour input and the API expect. */
function expand(v: string): string {
  const h = v.trim().replace('#', '');
  return '#' + (h.length === 3 ? h.split('').map((c) => c + c).join('') : h).toUpperCase();
}

/**
 * Theme colour for a tenant's site: preset swatches, a native picker for any
 * colour, a hex field, and a live preview of a button and link in that colour.
 * `value` is the raw text the operator typed; validate with isValidHex before
 * sending.
 */
export default function BrandColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const valid = isValidHex(value);
  const color = valid ? expand(value) : DEFAULT_BRAND_COLOR;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const on = valid && color === p.hex;
          return (
            <button
              key={p.hex}
              type="button"
              title={`${p.name} ${p.hex}`}
              aria-label={p.name}
              onClick={() => onChange(p.hex)}
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center ring-offset-2 ring-offset-bg-secondary transition-shadow',
                on ? 'ring-2 ring-text-primary' : 'hover:ring-2 hover:ring-border-primary',
              )}
              style={{ backgroundColor: p.hex }}
            >
              {on && <Check size={12} className="text-white" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label
          className="relative h-7 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-primary"
          title="Pick any colour"
          style={{ backgroundColor: color }}
        >
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={DEFAULT_BRAND_COLOR}
          maxLength={7}
          className={cn(
            'w-28 px-2.5 py-1.5 text-xs font-mono rounded-md bg-bg-tertiary border text-text-primary',
            value && !valid ? 'border-sell' : 'border-border-primary',
          )}
        />
        {/* Preview: what a client sees on the tenant's site. */}
        <span
          className="ml-auto inline-flex h-7 items-center rounded-full px-3 text-xxs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          Open account
        </span>
        <span className="text-xxs font-semibold" style={{ color }}>
          Link
        </span>
      </div>
      {value && !valid && (
        <p className="text-xxs text-sell">Use a hex colour such as #D60101.</p>
      )}
    </div>
  );
}
