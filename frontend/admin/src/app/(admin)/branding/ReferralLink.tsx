'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/** One-line copy control. Used for the referral link and every DNS value —
 *  those are strings people retype into a registrar, and a typo there costs
 *  them a support ticket. */
export function CopyField({ value, mono = true }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard is blocked on insecure origins; select-all is the fallback.
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <code
        className={`flex-1 min-w-0 truncate px-2.5 py-1.5 rounded-md bg-bg-tertiary border border-border-primary text-text-primary text-xs ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        title="Copy"
        className="p-1.5 rounded-md border border-border-primary text-text-tertiary hover:text-text-primary shrink-0"
      >
        {copied ? <Check size={13} className="text-buy" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
