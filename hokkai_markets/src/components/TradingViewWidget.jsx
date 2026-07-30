// ============================================
// HOKKAI MARKETS - TradingView Widget
// ============================================

import React, { useEffect, useRef, memo } from 'react'

function TradingViewWidget() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return

    // Avoid duplicate scripts on hot-reload
    if (container.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'FX:EURUSD',
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: 'rgba(7, 9, 14, 1)',
      gridColor: 'rgba(255, 255, 255, 0.04)',
    })

    container.current.appendChild(script)
  }, [])

  return (
    <div
      className="tradingview-widget-container rounded-2xl overflow-hidden border border-white/5"
      ref={container}
      style={{ height: '650px', width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

export default memo(TradingViewWidget)
