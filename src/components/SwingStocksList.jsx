import React, { useState, useEffect, useCallback, useRef } from 'react'
import API from '../services/api'

const POLL_INTERVAL_MS = 3000            // check status every 3 s
const POLL_TIMEOUT_MS  = 5 * 60 * 1000  // give up after 5 min
const AUTO_RESCAN_MS   = 5 * 60 * 1000  // re-trigger scan every 5 min

const SwingStocksList = ({ onPaperTrade, onPriceUpdate }) => {
  const [stocks, setStocks]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [scanPhase, setScanPhase]     = useState('idle') // 'idle'|'starting'|'scanning'|'done'|'error'
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError]             = useState(null)

  const isRunningRef   = useRef(false)  // guard — only one scan at a time
  const pollTimerRef   = useRef(null)
  const rescanTimerRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const fetchSwingStocks = useCallback(async () => {
    if (isRunningRef.current) return   // already in-flight, skip
    isRunningRef.current = true
    stopPolling()
    setLoading(true)
    setError(null)
    setScanPhase('starting')

    try {
      // 1️⃣  Kick off background scan — returns immediately
      await API.startSwingScan()
      setScanPhase('scanning')

      // 2️⃣  Poll /swing/status until done, error, or timeout
      const deadline = Date.now() + POLL_TIMEOUT_MS

      const poll = async () => {
        if (Date.now() > deadline) {
          stopPolling()
          setError('Scan timed out — please try refreshing.')
          setScanPhase('error')
          setLoading(false)
          isRunningRef.current = false
          return
        }
        try {
          const statusRes = await API.getSwingStatus()
          const { status, results = [] } = statusRes.data

          if (status === 'done') {
            stopPolling()
            // swingCache.results = positiveSwingStocks (already filtered)
            const nextStocks = results
            setStocks(nextStocks)
            onPriceUpdate?.(nextStocks)
            setLastUpdated(new Date())
            setScanPhase('done')
            setLoading(false)
            isRunningRef.current = false
          } else if (status === 'error') {
            stopPolling()
            setError(statusRes.data.error || 'Scan failed — please try again.')
            setScanPhase('error')
            setLoading(false)
            isRunningRef.current = false
          }
          // status === 'running' | 'idle' → keep polling
        } catch {
          // network hiccup during poll — keep trying
        }
      }

      poll()  // check immediately, then on interval
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    } catch (err) {
      console.error('Error starting swing scan:', err)
      setError('Failed to start swing scan')
      setScanPhase('error')
      setLoading(false)
      isRunningRef.current = false
    }
  }, [onPriceUpdate, stopPolling])

  // Mount: start scan, re-trigger every 5 min
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSwingStocks()
    rescanTimerRef.current = setInterval(fetchSwingStocks, AUTO_RESCAN_MS)
    return () => {
      clearInterval(rescanTimerRef.current)
      stopPolling()
    }
  }, [fetchSwingStocks, stopPolling])

  /* ─────────────── helpers ─────────────── */

  const formatMarketCap = (marketCap) => {
    if (!marketCap) return 'N/A'
    if (marketCap >= 1e12) return `₹${(marketCap / 1e12).toFixed(1)}L Cr`
    if (marketCap >= 1e10) return `₹${(marketCap / 1e10).toFixed(0)}K Cr`
    if (marketCap >= 1e7)  return `₹${(marketCap / 1e7).toFixed(0)}Cr`
    return `₹${(marketCap / 1e5).toFixed(0)}L`
  }

  const formatPrice = (price) => {
    if (price == null || !Number.isFinite(Number(price))) return 'N/A'
    return `₹${Number(price).toFixed(2)}`
  }

  const formatGap = (gap) => {
    if (gap == null || !Number.isFinite(Number(gap))) return 'N/A'
    const sign = gap >= 0 ? '+' : ''
    return `${sign}${Number(gap).toFixed(2)}%`
  }

  const getSignalColor = (label) => {
    switch (label) {
      case 'High-Quality Swing Setup':                return '#10b981'
      case 'Potential Swing – Needs Confirmation':    return '#f59e0b'
      case 'Support-Based Swing Attempt':             return '#3b82f6'
      default:                                        return '#6b7280'
    }
  }

  const getActionableToneClass = (quality) => {
    switch (quality?.tone) {
      case 'positive': return 'entry-quality-positive'
      case 'neutral':  return 'entry-quality-neutral'
      case 'negative': return 'entry-quality-negative'
      default:         return 'entry-quality-neutral'
    }
  }

  const buildModePresets = (stock) => {
    const currentPrice = Number(stock.currentPrice) || 0
    const support      = Number(stock.support)
    const resistance   = Number(stock.resistance)
    const manualStop   = currentPrice ? currentPrice * 0.97  : 0
    const manualT1     = currentPrice ? currentPrice * 1.03  : 0
    const manualT2     = currentPrice ? currentPrice * 1.06  : 0
    const intStop      = currentPrice ? currentPrice * 0.992 : 0
    const intT1        = currentPrice ? currentPrice * 1.008 : 0
    const intT2        = currentPrice ? currentPrice * 1.016 : 0

    return {
      custom: {
        mode: 'custom', tradeOrigin: 'custom',
        setupLabel: stock.swingView?.label || 'Manual Sandbox Trade',
        executionLabel: 'Manual paper trade',
        entryPrice: currentPrice,
        stopLoss: Number.isFinite(support) && support > 0 && support < currentPrice ? support : manualStop,
        target1:  Number.isFinite(resistance) && resistance > currentPrice ? resistance : manualT1,
        target2:  Number.isFinite(resistance) && resistance > currentPrice ? resistance * 1.03 : manualT2,
        planReason: 'Manual paper trade seeded from stock scan levels. You can edit entry, stop, and targets in the simulator.',
        executionReason: stock.actionableEntryQuality?.reason || 'Use this sandbox to test both profit-making and loss-making trade plans.',
        riskReward: '—',
      },
      swing: {
        mode: 'swing', tradeOrigin: 'system_plan',
        setupLabel: stock.swingView?.label || 'Swing setup',
        executionLabel: stock.actionableEntryQuality?.label || 'Qualified',
        entryPrice: stock.entryPrice, stopLoss: stock.stopLoss,
        target1: stock.target1, target2: stock.target2,
        planReason: stock.entryReason, executionReason: stock.actionableEntryQuality?.reason,
        riskReward: stock.riskReward,
      },
      intraday: {
        mode: 'intraday', tradeOrigin: 'custom',
        setupLabel: 'Intraday preset unavailable in Swing list',
        executionLabel: 'Manual review',
        entryPrice: currentPrice, stopLoss: intStop, target1: intT1, target2: intT2,
        planReason: 'Intraday system plan is not part of this swing payload. Levels are seeded from current structure.',
        executionReason: 'Confirm intraday thesis from Intraday tab before taking a system-driven intraday trade.',
        riskReward: '—',
      },
    }
  }

  /* ─────────────── render ─────────────── */

  const scanStatusLabel = { idle: 'Idle', starting: 'Starting scan…', scanning: 'Scanning market…', done: 'Up to date', error: 'Error' }[scanPhase] || ''

  if (loading && stocks.length === 0) {
    return (
      <div className="swing-stocks-container">
        <h2>📈 Swing Trading Opportunities</h2>
        <div className="loading">
          {scanPhase === 'starting' ? 'Starting scan…' : 'Scanning for swing trading opportunities…'}
        </div>
      </div>
    )
  }

  return (
    <div className="swing-stocks-container">
      <div className="swing-header">
        <div className="swing-title">
          <h2>📈 Swing Trading Opportunities</h2>
          <span className="live-indicator">● LIVE</span>
        </div>
        <div className="swing-controls">
          <button
            onClick={fetchSwingStocks}
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? scanStatusLabel : '🔄 Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last: {lastUpdated.toLocaleTimeString()} ({lastUpdated.toLocaleDateString()})
            </span>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

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
                <div className="stock-badges">
                  <div
                    className="signal-badge"
                    style={{ backgroundColor: getSignalColor(stock.swingView?.label) }}
                  >
                    {stock.swingView?.label}
                  </div>
                  {stock.actionableEntryQuality?.label && (
                    <div className={`entry-quality-badge ${getActionableToneClass(stock.actionableEntryQuality)}`}>
                      {stock.actionableEntryQuality.label}
                    </div>
                  )}
                </div>
              </div>

              <div className="swing-hero-metrics">
                <div className="swing-metric-tile">
                  <span>Current</span>
                  <strong>{formatPrice(stock.currentPrice)}</strong>
                </div>
                <div className="swing-metric-tile swing-metric-entry">
                  <span>Entry</span>
                  <strong>{formatPrice(stock.entryPrice)}</strong>
                </div>
                <div className="swing-metric-tile">
                  <span>RR</span>
                  <strong>1:{stock.riskReward}</strong>
                </div>
                <div className="swing-metric-tile">
                  <span>Gap</span>
                  <strong className={stock.gapOpenPct >= 0 ? 'positive' : 'negative'}>
                    {formatGap(stock.gapOpenPct)}
                  </strong>
                </div>
              </div>

              <div className="swing-action-row">
                <div className="swing-plan-summary">
                  <span>Stop {formatPrice(stock.stopLoss)}</span>
                  <span>T1 {formatPrice(stock.target1)}</span>
                  <span>T2 {formatPrice(stock.target2)}</span>
                </div>
                <button
                  className="paper-trade-btn swing-primary-cta"
                  onClick={() => {
                    const modePresets    = buildModePresets(stock)
                    const selectedPreset = modePresets.swing
                    onPaperTrade?.({
                      symbol: stock.symbol, companyName: stock.companyName,
                      mode: 'swing', tradeOrigin: selectedPreset.tradeOrigin,
                      setupLabel: selectedPreset.setupLabel, executionLabel: selectedPreset.executionLabel,
                      entryPrice: selectedPreset.entryPrice, stopLoss: selectedPreset.stopLoss,
                      target1: selectedPreset.target1, target2: selectedPreset.target2,
                      currentPrice: stock.currentPrice,
                      planReason: selectedPreset.planReason, executionReason: selectedPreset.executionReason,
                      riskReward: selectedPreset.riskReward, modePresets, source: 'swing_tab',
                    })
                  }}
                >
                  Use Swing Plan
                </button>
              </div>

              <div className="swing-detail-group swing-detail-group-wide">
                <div className="swing-detail-title">Setup Snapshot</div>
                <div className="swing-compact-grid">
                  <div className="metric-row">
                    <span className="metric-label">Market Cap</span>
                    <span className="metric-value">{formatMarketCap(stock.marketCap)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">RSI</span>
                    <span className="metric-value">{stock.rsi?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Volume Spike</span>
                    <span className={`metric-value ${stock.volume?.volumeSpike ? 'positive' : 'neutral'}`}>
                      {stock.volume?.volumeSpike ? '✓ Yes' : 'No'}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Above VWAP</span>
                    <span className={`metric-value ${stock.currentPrice > stock.vwap ? 'positive' : 'negative'}`}>
                      {stock.currentPrice > stock.vwap ? '✓ Yes' : 'No'}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Swing VWAP</span>
                    <span className={`metric-value ${stock.swingVwap && stock.currentPrice && stock.swingVwap > stock.currentPrice * 1.1 ? 'vwap-warning' : 'neutral'}`}>
                      {formatPrice(stock.swingVwap)}
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Actionability</span>
                    <span className={`metric-value ${getActionableToneClass(stock.actionableEntryQuality)}`}>
                      {stock.actionableEntryQuality?.label || 'Review'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="swing-thesis-strip">
                <div className="swing-thesis-card">
                  <span className="swing-thesis-label">Entry Reason</span>
                  <p>{stock.entryReason?.replace(/\s+/g, ' ').trim()}</p>
                </div>
                {stock.actionableEntryQuality?.reason && (
                  <div className={`swing-thesis-card ${getActionableToneClass(stock.actionableEntryQuality)}`}>
                    <span className="swing-thesis-label">Actionable View</span>
                    <p>{stock.actionableEntryQuality.reason}</p>
                  </div>
                )}
              </div>

              <div className="stock-reasons">
                <h4>Why Positive for Swing</h4>
                <ul>
                  {stock.swingView?.reasons?.slice(0, 2).map((reason, idx) => (
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
