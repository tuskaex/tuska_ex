// ============================================
// HOKKAI MARKETS - TradingView Forex Heatmap
// ============================================

import React, { useEffect, useRef, memo } from 'react'

function ForexHeatmap() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return

    // Avoid duplicate scripts on hot-reload
    if (container.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: 500,
      currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'],
      isTransparent: true,
      colorTheme: 'dark',
      locale: 'en',
      backgroundColor: 'rgba(7, 9, 14, 0)',
    })

    container.current.appendChild(script)
  }, [])

  return (
    <div
      className="tradingview-widget-container rounded-2xl overflow-hidden border border-white/5"
      ref={container}
      style={{ height: '500px', width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

export default memo(ForexHeatmap)
