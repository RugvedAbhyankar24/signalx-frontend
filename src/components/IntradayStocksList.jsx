import React, { useState, useEffect } from 'react'
import API from '../services/api'

const IntradayStocksList = () => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)

  const fetchIntradayStocks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await API.getIntradayPositiveStocks()
      setStocks(response.data.positiveStocks || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching intraday stocks:', err)
      setError('Failed to fetch intraday stocks')
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntradayStocks()
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchIntradayStocks, 120000)
    return () => clearInterval(interval)
  }, [])

  const formatMarketCap = (marketCap) => {
    if (!marketCap) return 'N/A'
    if (marketCap >= 1e12) return `₹${(marketCap / 1e12).toFixed(1)}L Cr`
    if (marketCap >= 1e10) return `₹${(marketCap / 1e10).toFixed(0)}K Cr`
    if (marketCap >= 1e7) return `₹${(marketCap / 1e7).toFixed(0)}Cr`
    return `₹${(marketCap / 1e5).toFixed(0)}L`
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A'
    return `₹${price.toFixed(2)}`
  }

  const formatGap = (gap) => {
    if (!gap) return 'N/A'
    const sign = gap >= 0 ? '+' : ''
    return `${sign}${gap.toFixed(2)}%`
  }

  const getSignalColor = (label) => {
    switch (label) {
      case 'Strong Intraday Buy':
        return '#10b981' // green
      case 'Momentum Continuation':
        return '#3b82f6' // blue
      case 'Breakout Candidate':
        return '#f59e0b' // amber
      default:
        return '#6b7280' // gray
    }
  }

  if (loading && stocks.length === 0) {
    return (
      <div className="intraday-stocks-container">
        <h2>🔥 Intraday Positive Stocks</h2>
        <div className="loading">Scanning for intraday opportunities...</div>
      </div>
    )
  }

  return (
    <div className="intraday-stocks-container">
      <div className="intraday-header">
        <h2>🔥 Intraday Positive Stocks</h2>
        <div className="intraday-controls">
          <button 
            onClick={fetchIntradayStocks} 
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {stocks.length === 0 && !loading ? (
        <div className="no-stocks">
          <p>No positive intraday signals found at the moment.</p>
          <p>Check back during market hours for opportunities.</p>
        </div>
      ) : (
        <div className="intraday-stocks-grid">
          {stocks.map((stock, index) => (
            <div key={stock.symbol || index} className="intraday-stock-card">
              <div className="stock-header">
                <div className="stock-info">
                  <h3>{stock.symbol}</h3>
                  <p className="company-name">{stock.companyName}</p>
                </div>
                <div 
                  className="signal-badge"
                  style={{ backgroundColor: getSignalColor(stock.intradayView.label) }}
                >
                  {stock.intradayView.label}
                </div>
              </div>

              <div className="stock-metrics">
                <div className="metric-row">
                  <span className="metric-label">Current Price:</span>
                  <span className="metric-value">{formatPrice(stock.currentPrice)}</span>
                </div>
                
                <div className="metric-row">
                  <span className="metric-label">Gap:</span>
                  <span className={`metric-value ${stock.gapNowPct >= 0 ? 'positive' : 'negative'}`}>
                    {formatGap(stock.gapNowPct || stock.gapOpenPct)}
                  </span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">RSI:</span>
                  <span className="metric-value">{stock.rsi?.toFixed(1) || 'N/A'}</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Market Cap:</span>
                  <span className="metric-value">{formatMarketCap(stock.marketCap)}</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Volume Spike:</span>
                  <span className={`metric-value ${stock.volume?.volumeSpike ? 'positive' : 'neutral'}`}>
                    {stock.volume?.volumeSpike ? '✓ Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="stock-reasons">
                <h4>Why Positive:</h4>
                <ul>
                  {stock.intradayView.reasons?.slice(0, 3).map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="intraday-footer">
        <p>
          Showing {stocks.length} positive signals from market scan.
          Only stocks with liquidity &gt; ₹1,000 Cr and strong technical signals are included.
        </p>
      </div>
    </div>
  )
}

export default IntradayStocksList
