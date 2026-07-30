// ============================================
// HOKKAI MARKETS - TradingView Market Sentiment
// ============================================

import React, { useEffect, useRef, memo } from 'react'

function MarketSentiment() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return
    if (container.current.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      isTransparent: true,
      height: 450,
      symbol: 'FX:EURUSD',
      showIntervalTabs: true,
      displayMode: 'multiple',
      locale: 'en',
      colorTheme: 'dark',
    })

    container.current.appendChild(script)
  }, [])

  return (
    <div
      className="tradingview-widget-container rounded-2xl overflow-hidden border border-white/5"
      ref={container}
      style={{ height: '450px', width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

export default memo(MarketSentiment)
