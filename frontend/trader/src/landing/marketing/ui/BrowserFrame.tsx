'use client'

import type { ReactNode } from 'react'

/**
 * Mac-style browser chrome for marketing screenshots.
 *
 * Exists because the SwissCresta-branded platform renders that used to
 * fill these slots were replaced with real TuskaEx screenshots, and the
 * genuine screenshots are smaller (900px wide) than the stock renders
 * they replaced (1672px). Upscaling them looked soft, so instead of
 * stretching the bitmap we cap it at its natural width and wrap it in
 * chrome — the frame carries the visual weight the oversized image used
 * to, and the pixels stay 1:1.
 *
 * `url` renders in the address pill. Keep it a real TuskaEx host so the
 * screenshot reads as our product, not a generic mockup.
 */
export default function BrowserFrame({
  children,
  url = 'trade.tuskaex.com',
  className = '',
}: {
  children: ReactNode
  url?: string
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_32px_80px_-32px_rgba(214,1,1,0.35)] ${className}`}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <span aria-hidden="true" className="flex shrink-0 gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        </span>
        <span className="mx-auto flex max-w-[60%] items-center gap-1.5 truncate rounded-md bg-white px-3 py-1 text-[11px] font-medium text-gray-500 ring-1 ring-gray-200">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3 w-3 shrink-0 text-[#D60101]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          {url}
        </span>
        {/* Spacer keeps the URL pill optically centred against the dots */}
        <span aria-hidden="true" className="w-[42px] shrink-0" />
      </div>
      {children}
    </div>
  )
}
