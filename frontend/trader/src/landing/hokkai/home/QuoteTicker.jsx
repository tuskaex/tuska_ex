'use client'

// ============================================
// TUSKAEX - Quote Ticker — Cyber-Samurai
// Four live quotes, centred, directly under the hero video
// ============================================

import React, { useEffect, useState } from 'react'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

/* The four quotes on show. `decimals` is declared here rather than read from
   the instruments endpoint: it is four symbols on a marketing strip, and one
   fewer network round-trip on first paint matters more than the indirection.
   If this list grows, switch to the `digits` field on /instruments/. */
const CHIPS = [
  { symbol: 'EURUSD', label: 'EUR/USD', decimals: 5 },
  { symbol: 'XAUUSD', label: 'XAU/USD', decimals: 2 },
  { symbol: 'BTCUSD', label: 'BTC/USD', decimals: 2 },
  { symbol: 'US30',   label: 'US30',    decimals: 1 },
]

/* Live prices come from the same Infoway feed the terminal trades on. Both
   endpoints are public and rate-limit exempt (see gateway api/instruments.py):
     /instruments/prices/all       — every symbol's current bid/ask
     /instruments/{sym}/bars?1D    — daily candles, for today's open
   Polling rather than /ws/prices: a marketing strip does not need tick-level
   latency, and this avoids owning a socket lifecycle on the landing page. */
const PRICES_URL = '/api/v1/instruments/prices/all'
const POLL_MS = 3000

/* The change figure is measured against TODAY'S OPEN, taken from the last
   daily bar. That is what a quote ticker means by "change", and it is the only
   honest option available: the tick payload carries no change field, and
   diffing against the first price this tab happened to see would produce a
   number that differs per visitor and drifts toward zero on reload. */
async function fetchDayOpens(signal) {
  const now = Math.floor(Date.now() / 1000)
  const from = now - 30 * 24 * 3600
  const entries = await Promise.all(
    CHIPS.map(async ({ symbol }) => {
      try {
        const r = await fetch(
          `/api/v1/instruments/${symbol}/bars?resolution=1D&from=${from}&to=${now}`,
          { signal },
        )
        if (!r.ok) return [symbol, null]
        const j = await r.json()
        const bars = Array.isArray(j?.bars) ? j.bars : []
        const last = bars[bars.length - 1]
        const open = Number(last?.open)
        return [symbol, Number.isFinite(open) && open > 0 ? open : null]
      } catch {
        return [symbol, null]
      }
    }),
  )
  return Object.fromEntries(entries)
}

export default function QuoteTicker() {
  // symbol -> mid price. Empty until the first poll lands; chips render a dash
  // rather than a placeholder number, matching how the rest of the platform
  // reports "no quote" instead of inventing one.
  const [prices, setPrices] = useState({})
  const [dayOpens, setDayOpens] = useState({})

  useEffect(() => {
    const ac = new AbortController()
    let alive = true

    fetchDayOpens(ac.signal).then((o) => { if (alive) setDayOpens(o) })

    const wanted = new Set(CHIPS.map((c) => c.symbol))
    const poll = async () => {
      try {
        const r = await fetch(PRICES_URL, { signal: ac.signal })
        if (!r.ok) return
        const list = await r.json()
        if (!Array.isArray(list) || !alive) return
        const next = {}
        for (const t of list) {
          const sym = String(t?.symbol || '').toUpperCase()
          if (!wanted.has(sym)) continue
          // A stale tick is a frozen quote the feed stopped refreshing. Drop it
          // so the chip shows a dash instead of a confident wrong price.
          if (t?.stale) continue
          const bid = Number(t.bid)
          const ask = Number(t.ask)
          const mid = Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : NaN
          if (Number.isFinite(mid) && mid > 0) next[sym] = mid
        }
        setPrices(next)
      } catch {
        /* network blip / aborted on unmount — keep the last good prices */
      }
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => { alive = false; ac.abort(); clearInterval(id) }
  }, [])

  return (
    <section
      className="relative overflow-hidden border-b border-white/5 py-3.5"
      style={{ background: 'rgba(5,7,10,0.55)', backdropFilter: 'blur(12px)' }}
      aria-label="Live market quotes"
    >
      {/* Top neon hairline — continues the seam out of the hero's dark bottom
          stop so the two sections read as one transition. */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(214, 1, 1,0.3), transparent)' }}
      />

      <div className="flex flex-wrap items-center justify-center gap-3 px-4">
        {CHIPS.map(({ symbol, label, decimals }) => {
          const price = prices[symbol]
          const open = dayOpens[symbol]
          const hasPrice = Number.isFinite(price)
          const pct = hasPrice && Number.isFinite(open)
            ? ((price - open) / open) * 100
            : null
          const up = pct !== null && pct >= 0

          return (
            <div
              key={symbol}
              className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-4 py-2 rounded-lg border border-white/10 transition-all duration-300 hover:border-white/25"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-white text-xs font-mono font-bold tracking-wider">{label}</span>
              <span className="text-slate-400 text-xs font-mono tabular-nums">
                {hasPrice
                  ? price.toLocaleString('en-US', {
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    })
                  : '—'}
              </span>
              {pct === null ? (
                /* No open to compare against yet, or no quote — render nothing
                   rather than a 0.00% that looks like a flat market. */
                <span className="text-slate-600 text-xs font-mono">—</span>
              ) : (
                <span
                  className={`flex items-center gap-0.5 text-xs font-mono font-semibold tabular-nums ${
                    up ? 'text-[#00d4aa]' : 'text-[#D60101]'
                  }`}
                >
                  {up ? <FiTrendingUp size={9} /> : <FiTrendingDown size={9} />}
                  {up ? '+' : ''}{pct.toFixed(2)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
