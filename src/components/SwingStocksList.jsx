import React, { useState, useEffect } from 'react'
import API from '../services/api'

const SwingStocksList = () => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)

  const fetchSwingStocks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await API.getSwingPositiveStocks()
      setStocks(response.data.positiveSwingStocks || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching swing stocks:', err)
      setError('Failed to fetch swing stocks')
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSwingStocks()
    
    // Auto-refresh every 5 minutes (swing signals change less frequently)
    const interval = setInterval(fetchSwingStocks, 300000)
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
      case 'High-Quality Swing Setup':
        return '#10b981' // green
      case 'Potential Swing – Needs Confirmation':
        return '#f59e0b' // amber
      case 'Support-Based Swing Attempt':
        return '#3b82f6' // blue
      default:
        return '#6b7280' // gray
    }
  }

  if (loading && stocks.length === 0) {
    return (
      <div className="swing-stocks-container">
        <h2>📈 Swing Trading Opportunities</h2>
        <div className="loading">Scanning for swing trading opportunities...</div>
      </div>
    )
  }

  return (
    <div className="swing-stocks-container">
      <div className="swing-header">
        <h2>📈 Swing Trading Opportunities</h2>
        <div className="swing-controls">
          <button 
            onClick={fetchSwingStocks} 
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
          <p>No positive swing signals found at the moment.</p>
          <p>Swing opportunities typically emerge during market consolidation phases.</p>
        </div>
      ) : (
        <div className="swing-stocks-grid">
          {stocks.map((stock, index) => (
            <div key={stock.symbol || index} className="swing-stock-card">
              <div className="stock-header">
                <div className="stock-info">
                  <h3>{stock.symbol}</h3>
                  <p className="company-name">{stock.companyName}</p>
                </div>
                <div 
                  className="signal-badge"
                  style={{ backgroundColor: getSignalColor(stock.swingView.label) }}
                >
                  {stock.swingView.label}
                </div>
              </div>

              <div className="stock-metrics">
                <div className="metric-row">
                  <span className="metric-label">Current Price:</span>
                  <span className="metric-value">{formatPrice(stock.currentPrice)}</span>
                </div>
                
                <div className="metric-row">
                  <span className="metric-label">Gap:</span>
                  <span className={`metric-value ${stock.gapOpenPct >= 0 ? 'positive' : 'negative'}`}>
                    {formatGap(stock.gapOpenPct)}
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

                <div className="metric-row">
                  <span className="metric-label">Above VWAP:</span>
                  <span className={`metric-value ${stock.currentPrice > stock.vwap ? 'positive' : 'negative'}`}>
                    {stock.currentPrice > stock.vwap ? '✓ Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="stock-reasons">
                <h4>Why Positive for Swing:</h4>
                <ul>
                  {stock.swingView.reasons?.slice(0, 3).map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="swing-horizon">
                <span className="horizon-badge">⏰ 3-15 days horizon</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="swing-footer">
        <p>
          Showing {stocks.length} swing trading opportunities from NSE500 scan.
          Swing trades are designed for 3-15 day holding periods with institutional-grade setups.
        </p>
      </div>
    </div>
  )
}

export default SwingStocksList
