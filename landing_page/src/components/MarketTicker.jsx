// ============================================
// HOKKAI MARKETS - Market Ticker — Cyber-Samurai
// Live scrolling market data with neon indicators
// ============================================

import React from 'react'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

const initialMarketData = [
  { symbol: 'EUR/USD', price: '1.08542', change: '+0.0023', percent: '+0.21%', positive: true },
  { symbol: 'GBP/USD', price: '1.26731', change: '+0.0041', percent: '+0.32%', positive: true },
  { symbol: 'USD/JPY', price: '149.823', change: '-0.312',  percent: '-0.21%', positive: false },
  { symbol: 'XAU/USD', price: '2,034.50', change: '+8.20',  percent: '+0.40%', positive: true },
  { symbol: 'BTC/USD', price: '43,215.00', change: '-312.50', percent: '-0.72%', positive: false },
  { symbol: 'ETH/USD', price: '2,287.30', change: '+45.20', percent: '+2.01%', positive: true },
  { symbol: 'US30',    price: '38,654.20', change: '+124.30', percent: '+0.32%', positive: true },
  { symbol: 'NAS100',  price: '17,432.10', change: '-89.40', percent: '-0.51%', positive: false },
  { symbol: 'OIL/USD', price: '78.42',    change: '+0.85',  percent: '+1.09%', positive: true },
  { symbol: 'USD/CHF', price: '0.88234',  change: '-0.0012', percent: '-0.14%', positive: false },
  { symbol: 'AUD/USD', price: '0.65421',  change: '+0.0018', percent: '+0.28%', positive: true },
  { symbol: 'USD/CAD', price: '1.35621',  change: '+0.0031', percent: '+0.23%', positive: true },
  { symbol: 'GER40',   price: '16,842.30', change: '+98.70', percent: '+0.59%', positive: true },
  { symbol: 'UK100',   price: '7,634.50', change: '-23.10', percent: '-0.30%', positive: false },
  { symbol: 'XAG/USD', price: '22.845',   change: '+0.234', percent: '+1.03%', positive: true },
]

function TickerItem({ item }) {
  return (
    <div className="ticker-item flex items-center gap-2.5 px-5 border-r border-white/5">
      {/* Symbol */}
      <span className="text-white font-semibold text-xs font-mono tracking-wider">{item.symbol}</span>

      {/* Separator */}
      <span className="text-white/20 text-xs">|</span>

      {/* Price */}
      <span className="text-slate-300 text-xs font-mono">{item.price}</span>

      {/* Change with glow dot */}
      <span
        className={`flex items-center gap-1 text-xs font-mono font-semibold ${
          item.positive ? 'text-[#00d4aa]' : 'text-[#e11d48]'
        }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: item.positive ? '#00d4aa' : '#e11d48',
            boxShadow: item.positive
              ? '0 0 5px rgba(0,212,170,0.8)'
              : '0 0 5px rgba(225,29,72,0.8)',
          }}
        />
        {item.positive ? <FiTrendingUp size={9} /> : <FiTrendingDown size={9} />}
        {item.percent}
      </span>
    </div>
  )
}

function MarketTicker() {
  const tickerData = [...initialMarketData, ...initialMarketData]

  return (
    <div
      className="border-b border-white/5 overflow-hidden py-2.5"
      style={{ background: 'rgba(5,7,10,0.9)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-4 flex-shrink-0 border-r border-white/10">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#e11d48] animate-pulse"
            style={{ boxShadow: '0 0 6px rgba(225,29,72,0.9)' }}
          />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-mono whitespace-nowrap">
            Live
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="ticker-wrapper flex-1 overflow-hidden">
          <div className="ticker-track">
            {tickerData.map((item, index) => (
              <TickerItem key={`${item.symbol}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarketTicker
