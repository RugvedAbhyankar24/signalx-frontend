import React, { useCallback, useEffect, useRef, useState } from 'react'
import API from './services/api'
import StockCard from './components/StockCard'
import MarketTicker from './components/MarketTicker'
import MarketOverview from './components/MarketOverview'
import IntradayStocksList from './components/IntradayStocksList'
import SwingStocksList from './components/SwingStocksList'
import CollapsibleSection from './components/CollapsibleSection'
import PaperTradeModal from './components/PaperTradeModal'
import PaperTradesPanel from './components/PaperTradesPanel'
import {
  autoSquareOffIntradayTrades,
  createPaperTrade,
  loadPaperTrades,
  manuallyCloseTrade,
  savePaperTrades,
  updateTradesWithQuotes,
} from './utils/paperTrading'

const NSE_SUGGESTIONS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd' },
  { symbol: 'INFY', name: 'Infosys Ltd' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd' },
  { symbol: 'ITC', name: 'ITC Ltd' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd' },
  { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories Ltd' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd' },
  { symbol: 'SHREECEM', name: 'Shree Cement Ltd' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd' },
  { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories Ltd' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd' },
  { symbol: 'UPL', name: 'UPL Ltd' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd' },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd' },
  { symbol: 'TITAN', name: 'Titan Company Ltd' },
  { symbol: 'NTPC', name: 'NTPC Ltd' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd' },
  { symbol: 'WIPRO', name: 'Wipro Ltd' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports and Special Economic Zone Ltd' },
  { symbol: 'DABUR', name: 'Dabur India Ltd' },
  { symbol: 'CIPLA', name: 'Cipla Ltd' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd' },
  { symbol: 'ONGC', name: 'Oil and Natural Gas Corporation Ltd' },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd' },
  { symbol: 'TATACOMM', name: 'Tata Communications Ltd' },
  { symbol: 'VEDL', name: 'Vedanta Ltd' }
]

const isMarketOpen = () => {
  const ist = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  )

  const minutes = ist.getHours() * 60 + ist.getMinutes()
  
  // Check for budget session (Feb 1st - extended hours, includes Sunday)
  const today = ist.getDate()
  const month = ist.getMonth() + 1 // JavaScript months are 0-indexed
  
  // Budget session: 9:15 AM to 3:30 PM IST (555 to 930 minutes) - same as regular hours
  // Note: Budget session can be on Sunday, so we don't check weekend here
  if (month === 2 && today === 1) {
    return minutes >= 555 && minutes <= 930
  }
  
  // For normal days, check if it's weekday
  const day = ist.getDay()
  if (day === 0 || day === 6) return false
  
  // Normal market hours: 9:15 AM to 3:30 PM IST (555 to 930 minutes)
  return minutes >= 555 && minutes <= 930
}

const PAPER_TRADE_REFRESH_MS = 5000

export default function App() {
  const [symbolsInput, setSymbolsInput] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [marketLive, setMarketLive] = useState(isMarketOpen())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [paperTrades, setPaperTrades] = useState(() => loadPaperTrades())
  const [paperTradeDraft, setPaperTradeDraft] = useState(null)
  const [toast, setToast] = useState('')
  const autoRefreshRef = useRef(null)
  const paperQuotesRefreshRef = useRef(null)
  const scanRequestRef = useRef(false)
  const paperQuotesRequestRef = useRef(false)

  useEffect(() => {
    const i = setInterval(() => {
      setMarketLive(isMarketOpen())
    }, 30000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    const applyAutoSquareOff = () => {
      setPaperTrades((current) => autoSquareOffIntradayTrades(current))
    }

    applyAutoSquareOff()
    const intervalId = setInterval(applyAutoSquareOff, 30000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    savePaperTrades(paperTrades)
  }, [paperTrades])

  useEffect(() => {
    if (!toast) return
    const timeoutId = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(timeoutId)
  }, [toast])

  const filteredSuggestions = NSE_SUGGESTIONS.filter(
    s =>
      symbolsInput &&
      (s.symbol.includes(symbolsInput.toUpperCase()) ||
        s.name.toLowerCase().includes(symbolsInput.toLowerCase()))
  )
  const openTradeSymbols = Array.from(
    new Set(
      paperTrades
        .filter((trade) => !String(trade.status).startsWith('closed'))
        .map((trade) => trade.symbol)
        .filter(Boolean)
    )
  )
  const openTradeSymbolsKey = openTradeSymbols.join(',')

  const runScan = useCallback(async () => {
    const symbolToScan = selectedSymbol || symbolsInput.trim()
    if (!symbolToScan || scanRequestRef.current) return

    scanRequestRef.current = true
    setLoading(true)
    setLastUpdated(new Date())

    try {
      const response = await API.scan({
        symbols: [symbolToScan],
        gapThreshold: 0.8,
        rsiPeriod: 14
      })
      setData(response.data.results || [])
    } catch (e) {
      console.error('Scan error:', e)
      setToast(e.message || 'Scan failed')
      setData([])
    } finally {
      scanRequestRef.current = false
      setLoading(false)
    }
  }, [selectedSymbol, symbolsInput])

  useEffect(() => {
    if (!marketLive || !symbolsInput.trim()) return
    autoRefreshRef.current = setInterval(runScan, 60000)
    return () => clearInterval(autoRefreshRef.current)
  }, [marketLive, runScan, symbolsInput])

  const syncTradePrices = useCallback((items = []) => {
    if (!Array.isArray(items) || items.length === 0) return

    const quotes = items.reduce((acc, item) => {
      if (item?.symbol && item?.currentPrice != null) {
        acc[item.symbol] = item.currentPrice
      }
      return acc
    }, {})

    if (Object.keys(quotes).length === 0) return

    setPaperTrades((current) => updateTradesWithQuotes(current, quotes))
  }, [])

  const refreshPaperTradeQuotes = useCallback(async () => {
    if (!marketLive || openTradeSymbols.length === 0 || paperQuotesRequestRef.current) return

    try {
      paperQuotesRequestRef.current = true
      const response = await API.getPaperTradeQuotes(openTradeSymbols.slice(0, 25))
      syncTradePrices(response.data?.results || [])
    } catch (error) {
      console.error('Paper trade quote refresh error:', error)
    } finally {
      paperQuotesRequestRef.current = false
    }
  }, [marketLive, openTradeSymbols, syncTradePrices])

  useEffect(() => {
    if (!marketLive) {
      if (paperQuotesRefreshRef.current) {
        clearInterval(paperQuotesRefreshRef.current)
      }
      return
    }

    if (openTradeSymbols.length === 0) return

    refreshPaperTradeQuotes()
    paperQuotesRefreshRef.current = setInterval(refreshPaperTradeQuotes, PAPER_TRADE_REFRESH_MS)
    return () => clearInterval(paperQuotesRefreshRef.current)
  }, [marketLive, openTradeSymbols.length, openTradeSymbolsKey, refreshPaperTradeQuotes])

  useEffect(() => {
    syncTradePrices(data)
  }, [data, syncTradePrices])

  const openPaperTrade = (draft) => {
    setPaperTradeDraft(draft)
  }

  const confirmPaperTrade = ({ signal, capital, riskPercent, quantity }) => {
    const trade = createPaperTrade({
      signal,
      capital,
      riskPercent,
      quantity,
    })

    setPaperTrades((current) => [trade, ...current])
    setPaperTradeDraft(null)
  }

  const closePaperTrade = (tradeId) => {
    setPaperTrades((current) =>
      current.map((trade) =>
        trade.id === tradeId ? manuallyCloseTrade(trade) : trade
      )
    )
    setToast('Trade moved to closed trades')
  }

  const deletePaperTrade = (tradeId) => {
    const trade = paperTrades.find((item) => item.id === tradeId)
    setPaperTrades((current) => current.filter((trade) => trade.id !== tradeId))
    if (trade) {
      setToast(`${trade.symbol} deleted from history`)
    } else {
      setToast('Trade deleted')
    }
  }

  const clearClosedPaperTrades = () => {
    const removed = paperTrades.filter((trade) =>
      String(trade.status).startsWith('closed')
    ).length
    setPaperTrades((current) =>
      current.filter((trade) => !String(trade.status).startsWith('closed'))
    )
    if (removed > 0) {
      setToast(`Cleared ${removed} closed trade${removed > 1 ? 's' : ''}`)
    }
  }

  const SkeletonCard = () => (
  <div className="skeleton-card">
    {/* Header */}
    <div className="skeleton-header">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-pill" />
    </div>

    {/* Market Data */}
    <div className="skeleton-section">
      <div className="skeleton skeleton-section-title" />
      <div className="skeleton-row">
        <div className="skeleton skeleton-key" />
        <div className="skeleton skeleton-value" />
      </div>
      <div className="skeleton-row">
        <div className="skeleton skeleton-key" />
        <div className="skeleton skeleton-value" />
      </div>
    </div>

    {/* Technical Signals */}
    <div className="skeleton-section">
      <div className="skeleton skeleton-section-title" />
      <div className="skeleton-row">
        <div className="skeleton skeleton-key" />
        <div className="skeleton skeleton-value" />
      </div>
      <div className="skeleton-row">
        <div className="skeleton skeleton-key" />
        <div className="skeleton skeleton-value" />
      </div>
    </div>

    {/* Decision */}
    <div className="skeleton skeleton-pill-wide" />
  </div>
)


  return (
    <div className="container">
      <div className="app-shell">
        <div className="app-shell-grid" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="ambient-orb orb-a" aria-hidden="true" />
        <div className="ambient-orb orb-b" aria-hidden="true" />
        <div className="ambient-orb orb-c" aria-hidden="true" />

        <div className="app-header">
          <div className="top-left-logo" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            <img src="/SignalX_logo.svg" alt="SignalX" className="app-logo" />
          </div>
        </div>

        <div className="layout">

          {/* MAIN CONTENT */}
          <div className="main-content">
            <div className="hero-panel">
              <div className="hero-panel-glow" aria-hidden="true" />
              <div className="hero-panel-layout">
                <div className="hero-copy">
                  <div className="hero">
                    <h1>SignalX — Smart Intraday Trade Signals</h1>
                    <p>
                      Intraday scanner using <b>Gap %, RSI, VWAP & Volume</b>
                    </p>
                  </div>

                  <div className="hero-status-strip">
                    <div className="hero-status-tile">
                      <div
                        className={`market-pulse-chip ${marketLive ? 'is-live' : 'is-closed'}`}
                      >
                        <span className="market-pulse-dot" />
                        {marketLive ? '🟢 Market Live' : '🕒 Market Closed'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-visual" aria-hidden="true">
                  <div className="hero-symbol-lane lane-top">
                    <div className="hero-symbol-track">
                      <span>RELIANCE</span>
                      <span>TCS</span>
                      <span>HDFCBANK</span>
                      <span>ICICIBANK</span>
                      <span>INFY</span>
                      <span>SBIN</span>
                      <span>LT</span>
                      <span>ITC</span>
                      <span>RELIANCE</span>
                      <span>TCS</span>
                      <span>HDFCBANK</span>
                      <span>ICICIBANK</span>
                    </div>
                  </div>
                  <div className="hero-symbol-lane lane-mid">
                    <div className="hero-symbol-track reverse">
                      <span>AXISBANK</span>
                      <span>KOTAKBANK</span>
                      <span>BHARTIARTL</span>
                      <span>MARUTI</span>
                      <span>BAJFINANCE</span>
                      <span>ASIANPAINT</span>
                      <span>AXISBANK</span>
                      <span>KOTAKBANK</span>
                      <span>BHARTIARTL</span>
                      <span>MARUTI</span>
                      <span>BAJFINANCE</span>
                      <span>ASIANPAINT</span>
                    </div>
                  </div>
                  <div className="hero-symbol-lane lane-bottom">
                    <div className="hero-symbol-track slow">
                      <span>NTPC</span>
                      <span>POWERGRID</span>
                      <span>SUNPHARMA</span>
                      <span>TITAN</span>
                      <span>ULTRACEMCO</span>
                      <span>ONGC</span>
                      <span>NTPC</span>
                      <span>POWERGRID</span>
                      <span>SUNPHARMA</span>
                      <span>TITAN</span>
                      <span>ULTRACEMCO</span>
                      <span>ONGC</span>
                    </div>
                  </div>
                  <div className="hero-focus-orb">
                    <span className="hero-focus-ring ring-1" />
                    <span className="hero-focus-ring ring-2" />
                    <span className="hero-focus-ring ring-3" />
                    <span className="hero-focus-crosshair" />
                  </div>
                  <div className="hero-data-columns">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>

            <div className="scan-panel">
              <div className="scan-panel-chrome" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="scan-panel-visual" aria-hidden="true">
                <div className="scan-grid-flow">
                  <span className="scan-grid-line line-1" />
                  <span className="scan-grid-line line-2" />
                  <span className="scan-grid-line line-3" />
                  <span className="scan-grid-line line-4" />
                </div>
                <div className="scan-query-stream">
                  <span>RELIANCE</span>
                  <span>BHARTIARTL</span>
                  <span>TCS</span>
                  <span>INFY</span>
                  <span>SBIN</span>
                  <span>ICICIBANK</span>
                </div>
                <div className="scan-query-stream alt">
                  <span>HDFCBANK</span>
                  <span>LT</span>
                  <span>KOTAKBANK</span>
                  <span>MARUTI</span>
                  <span>ITC</span>
                  <span>AXISBANK</span>
                </div>
                <span className="scan-beam" />
                <span className="scan-target-node" />
                <span className="scan-target-node second" />
              </div>

              <div className="search-box">
                <label>Enter Stock Symbol</label>

                <div className="search-wrapper">
                  <input
                    value={symbolsInput}
                    onChange={(e) => {
                      setSymbolsInput(e.target.value.toUpperCase())
                      setSelectedSymbol('')
                      setShowSuggestions(true)
                    }}
                    placeholder="Search NSE stock (RELIANCE, BHARTIARTL, TCS...)"
                  />

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="suggestions">
                      {filteredSuggestions.map((s) => (
                        <div
                          key={s.symbol}
                          className="suggestion-item"
                          onMouseDown={() => {
                            setSymbolsInput(s.symbol)
                            setSelectedSymbol(s.symbol)
                            setShowSuggestions(false)
                          }}
                        >
                          <strong>{s.symbol}</strong>
                          <span>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={runScan}
                  disabled={loading || !symbolsInput.trim()}
                >
                  {loading ? 'Scanning…' : 'Scan Stock'}
                </button>

                {lastUpdated && (
                  <div className="muted scan-last-updated">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            <div className="result-section">
              {loading ? (
                <div className="result-grid">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : data.length > 0 ? (
                <div className="result-grid">
                  {data.map((item, index) => (
                    <StockCard
                      key={item?.symbol || index}
                      item={item}
                      onPaperTrade={openPaperTrade}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <CollapsibleSection title="🔥 Intraday Positive Stocks" defaultCollapsed={true}>
              <IntradayStocksList
                onPaperTrade={openPaperTrade}
                onPriceUpdate={syncTradePrices}
              />
            </CollapsibleSection>

            <CollapsibleSection title="🔥 Swing Trading Opportunities" defaultCollapsed={true}>
              <SwingStocksList
                onPaperTrade={openPaperTrade}
                onPriceUpdate={syncTradePrices}
              />
            </CollapsibleSection>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <MarketOverview />
            <PaperTradesPanel
              trades={paperTrades}
              onCloseTrade={closePaperTrade}
              onDeleteTrade={deletePaperTrade}
              onClearClosedTrades={clearClosedPaperTrades}
              marketLive={marketLive}
            />
          </div>
        </div>

        <MarketTicker />

        {paperTradeDraft && (
          <PaperTradeModal
            key={`${paperTradeDraft.symbol}-${paperTradeDraft.mode}-${paperTradeDraft.source}-${paperTradeDraft.entryPrice}-${paperTradeDraft.stopLoss}-${paperTradeDraft.target1}-${paperTradeDraft.target2}`}
            draft={paperTradeDraft}
            onClose={() => setPaperTradeDraft(null)}
            onConfirm={confirmPaperTrade}
          />
        )}

        {toast && (
          <div className="app-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        <div className="footer">
          <div className="footer-content">
            <p>Focused on Indian NSE stocks (NIFTY 500). Symbols must be valid NSE tickers.</p>
            <div className="disclaimer">
              <p>Market data shown is for informational purposes only. Not intended for trading decisions.</p>
              <p>This application is not affiliated with NSE, BSE, or any financial organization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
