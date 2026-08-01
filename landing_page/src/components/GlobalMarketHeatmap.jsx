// ============================================
// HOKKAI MARKETS - TradingView Global Market Heatmap
// ============================================

import React, { useEffect, useRef, memo } from 'react'

function GlobalMarketHeatmap() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return
    if (container.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: 'AllUSA',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'en',
      symbolUrl: '',
      colorTheme: 'dark',
      hasTopBar: true,
      isDataSetEnabled: true,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: 600,
    })

    container.current.appendChild(script)
  }, [])

  return (
    <div
      className="tradingview-widget-container rounded-2xl overflow-hidden border border-white/5"
      ref={container}
      style={{ height: '600px', width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

export default memo(GlobalMarketHeatmap)
