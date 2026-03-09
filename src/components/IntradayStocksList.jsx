import React, { useState, useEffect, useCallback } from 'react'
import API from '../services/api'

const IntradayStocksList = ({ onPaperTrade, onPriceUpdate }) => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)

  const fetchIntradayStocks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await API.getIntradayPositiveStocks()
      const nextStocks = response.data.positiveStocks || []
      setStocks(nextStocks)
      onPriceUpdate?.(nextStocks)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching intraday stocks:', err)
      setError('Failed to fetch intraday stocks')
      setStocks([])
    } finally {
      setLoading(false)
    }
  }, [onPriceUpdate])

  useEffect(() => {
    fetchIntradayStocks()
    
    // Auto-refresh every 30 seconds (NSE API rate limit protection)
    const interval = setInterval(fetchIntradayStocks, 30000)
    return () => clearInterval(interval)
  }, [fetchIntradayStocks])

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

  const getActionableToneClass = (quality) => {
    switch (quality?.tone) {
      case 'positive':
        return 'entry-quality-positive'
      case 'neutral':
        return 'entry-quality-neutral'
      case 'negative':
        return 'entry-quality-negative'
      default:
        return 'entry-quality-neutral'
    }
  }

  const buildModePresets = (stock) => {
    const currentPrice = Number(stock.currentPrice) || 0
    const support = Number(stock.support)
    const resistance = Number(stock.resistance)
    const manualStop = currentPrice ? currentPrice * 0.97 : 0
    const manualTarget1 = currentPrice ? currentPrice * 1.03 : 0
    const manualTarget2 = currentPrice ? currentPrice * 1.06 : 0
    const swingStop = currentPrice ? currentPrice * 0.955 : 0
    const swingTarget1 = currentPrice ? currentPrice * 1.04 : 0
    const swingTarget2 = currentPrice ? currentPrice * 1.08 : 0

    return {
      custom: {
        mode: 'custom',
        tradeOrigin: 'custom',
        setupLabel: stock.intradayView?.label || 'Manual Sandbox Trade',
        executionLabel: 'Manual paper trade',
        entryPrice: currentPrice,
        stopLoss: Number.isFinite(support) && support > 0 && support < currentPrice ? support : manualStop,
        target1: Number.isFinite(resistance) && resistance > currentPrice ? resistance : manualTarget1,
        target2: Number.isFinite(resistance) && resistance > currentPrice ? resistance * 1.03 : manualTarget2,
        planReason: 'Manual paper trade seeded from stock scan levels. You can edit entry, stop, and targets in the simulator.',
        executionReason: stock.actionableEntryQuality?.reason || 'Use this sandbox to test both profit-making and loss-making trade plans.',
        riskReward: '—',
      },
      intraday: {
        mode: 'intraday',
        tradeOrigin: 'system_plan',
        setupLabel: stock.intradayView?.label || 'Intraday setup',
        executionLabel: stock.actionableEntryQuality?.label || 'Qualified',
        entryPrice: stock.entryPrice,
        stopLoss: stock.stopLoss,
        target1: stock.target1,
        target2: stock.target2,
        planReason: stock.entryReason,
        executionReason: stock.actionableEntryQuality?.reason,
        riskReward: stock.riskReward,
      },
      swing: {
        mode: 'swing',
        tradeOrigin: 'custom',
        setupLabel: 'Swing preset unavailable in Intraday list',
        executionLabel: 'Manual review',
        entryPrice: currentPrice,
        stopLoss: Number.isFinite(support) && support > 0 && support < currentPrice ? support : swingStop,
        target1: Number.isFinite(resistance) && resistance > currentPrice ? resistance : swingTarget1,
        target2: Number.isFinite(resistance) && resistance > currentPrice ? resistance * 1.04 : swingTarget2,
        planReason: 'Swing system plan is not part of this intraday payload. Levels are seeded from current structure.',
        executionReason: 'Confirm swing thesis from Swing tab before taking a system-driven swing trade.',
        riskReward: '—',
      },
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
        <div className="intraday-title">
          <h2>🔥 Intraday Positive Stocks</h2>
          <span className="live-indicator">● LIVE</span>
        </div>
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
              Last: {lastUpdated.toLocaleTimeString()} ({lastUpdated.toLocaleDateString()})
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
                <div className="stock-badges">
                  <div
                    className="signal-badge"
                    style={{ backgroundColor: getSignalColor(stock.intradayView.label) }}
                  >
                    {stock.intradayView.label}
                  </div>
                  {stock.actionableEntryQuality?.label && (
                    <div className={`entry-quality-badge ${getActionableToneClass(stock.actionableEntryQuality)}`}>
                      {stock.actionableEntryQuality.label}
                    </div>
                  )}
                </div>
              </div>

              <div className="stock-metrics">
                <div className="metric-row">
                  <span className="metric-label">Current Price:</span>
                  <span className="metric-value">{formatPrice(stock.currentPrice)}</span>
                </div>
                
                <div className="metric-row entry-price">
                  <span className="metric-label">Entry Price:</span>
                  <span className="metric-value entry-price-value">{formatPrice(stock.entryPrice)}</span>
                </div>

                <div className="metric-row metric-row-action">
                  <span className="metric-label">Simulator:</span>
                  <button
                    className="paper-trade-btn"
                    onClick={() => {
                      const modePresets = buildModePresets(stock)
                      const selectedPreset = modePresets.intraday
                      onPaperTrade?.({
                        symbol: stock.symbol,
                        companyName: stock.companyName,
                        mode: 'intraday',
                        tradeOrigin: selectedPreset.tradeOrigin,
                        setupLabel: selectedPreset.setupLabel,
                        executionLabel: selectedPreset.executionLabel,
                        entryPrice: selectedPreset.entryPrice,
                        stopLoss: selectedPreset.stopLoss,
                        target1: selectedPreset.target1,
                        target2: selectedPreset.target2,
                        currentPrice: stock.currentPrice,
                        planReason: selectedPreset.planReason,
                        executionReason: selectedPreset.executionReason,
                        riskReward: selectedPreset.riskReward,
                        modePresets,
                        source: 'intraday_tab',
                      })
                    }}
                  >
                    Use Intraday Plan
                  </button>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Stop Loss:</span>
                  <span className="metric-value stop-loss">{formatPrice(stock.stopLoss)}</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Target 1:</span>
                  <span className="metric-value target">{formatPrice(stock.target1)}</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Target 2:</span>
                  <span className="metric-value target2">{formatPrice(stock.target2)}</span>
                </div>

                <div className="metric-row">
                  <span className="metric-label">Risk/Reward:</span>
                  <span className="metric-value risk-reward">1:{stock.riskReward}</span>
                </div>

                <div className="metric-row entry-reason">
                  <span className="metric-label">Entry Reason:</span>
                  <span className="metric-value entry-reason-text">
                    {stock.entryReason?.replace(/\s+/g, ' ').trim()}
                  </span>
                </div>

                {stock.actionableEntryQuality?.reason && (
                  <div className="metric-row entry-quality-row">
                    <span className="metric-label">Actionable View:</span>
                    <span className={`metric-value entry-quality-text ${getActionableToneClass(stock.actionableEntryQuality)}`}>
                      {stock.actionableEntryQuality.reason}
                    </span>
                  </div>
                )}
                
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
                  <span className="metric-label">VWAP:</span>
                  <span className={`metric-value ${stock.vwap && stock.currentPrice && stock.vwap > stock.currentPrice * 1.1 ? 'vwap-warning' : 'neutral'}`}>
                    {formatPrice(stock.vwap)}
                    {stock.vwap && stock.currentPrice && stock.vwap > stock.currentPrice * 1.1 && (
                      <span className="vwap-warning-text"> (far above - mean reversion risk)</span>
                    )}
                  </span>
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
