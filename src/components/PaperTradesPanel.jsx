import React, { useMemo, useState } from 'react'

const formatPrice = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—'
}

const formatPnl = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}₹${n.toFixed(2)}`
}

const formatStamp = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatTimeOnly = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function PaperTradesPanel({
  trades,
  onCloseTrade,
  onDeleteTrade,
  onClearClosedTrades,
  marketLive,
}) {
  const [showClosed, setShowClosed] = useState(false)

  const openTrades = useMemo(
    () => trades.filter((trade) => !String(trade.status).startsWith('closed')),
    [trades]
  )
  const closedTrades = useMemo(
    () =>
      trades
        .filter((trade) => String(trade.status).startsWith('closed'))
        .sort((a, b) => {
          const aTime = new Date(a.closedAt || a.lastUpdated || 0).getTime()
          const bTime = new Date(b.closedAt || b.lastUpdated || 0).getTime()
          return bTime - aTime
        }),
    [trades]
  )

  const totals = useMemo(() => {
    const openPnl = openTrades.reduce((sum, trade) => sum + Number(trade.unrealizedPnl || 0), 0)
    const realized = closedTrades.reduce((sum, trade) => sum + Number(trade.realizedPnl || 0), 0)
    const wins = closedTrades.filter((trade) => Number(trade.realizedPnl) > 0).length

    return {
      openPnl,
      realized,
      closedCount: closedTrades.length,
      winRate: closedTrades.length ? (wins / closedTrades.length) * 100 : 0,
    }
  }, [closedTrades, openTrades])

  const getOriginLabel = (trade) =>
    trade.tradeOrigin === 'system_plan'
      ? 'System Plan'
      : trade.tradeOrigin === 'system_override'
      ? 'System Override'
      : 'Manual Trade'

  const getModeLabel = (trade) => (trade.mode === 'custom' ? 'manual' : trade.mode)
  const getLeverageLabel = (trade) => `${Number(trade.leverageMultiplier || 1).toFixed(2)}x`

  const handleClearClosed = () => {
    if (closedTrades.length === 0) return
    const ok = window.confirm(
      `Clear ${closedTrades.length} closed paper trade${closedTrades.length > 1 ? 's' : ''}? This cannot be undone.`
    )
    if (!ok) return
    onClearClosedTrades()
  }

  return (
    <div className="paper-trades-panel">
      <div className="paper-trades-header">
        <div>
          <h3>Paper Trading Sandbox</h3>
          <p>
            {marketLive
              ? 'Live mark-to-market using latest available prices.'
              : 'Market closed. PnL is frozen at the last market price until a fresh quote comes in.'}
          </p>
        </div>
        <span className={`paper-market-state ${marketLive ? 'market-live' : 'market-frozen'}`}>
          {marketLive ? 'Live MTM' : 'Price Frozen'}
        </span>
      </div>

      <div className="paper-trades-summary">
        <div className="paper-summary-tile">
          <span>Open Trades</span>
          <strong>{openTrades.length}</strong>
        </div>
        <div className="paper-summary-tile">
          <span>{marketLive ? 'Open PnL' : 'Frozen PnL'}</span>
          <strong className={totals.openPnl >= 0 ? 'positive' : 'negative'}>{formatPnl(totals.openPnl)}</strong>
        </div>
        <div className="paper-summary-tile">
          <span>Realized PnL</span>
          <strong className={totals.realized >= 0 ? 'positive' : 'negative'}>{formatPnl(totals.realized)}</strong>
        </div>
        <div className="paper-summary-tile">
          <span>Win Rate</span>
          <strong>{totals.winRate.toFixed(0)}%</strong>
        </div>
      </div>

      {openTrades.length === 0 ? (
        <div className="paper-trades-empty">
          No paper trades yet. Launch one from stock search, intraday, or swing cards.
        </div>
      ) : (
        <div className="paper-trade-list">
          {openTrades.map((trade) => (
            <div key={trade.id} className="paper-trade-card">
              <div className="paper-trade-card-header">
                <div>
                  <div className="paper-trade-symbol">{trade.symbol}</div>
                  <div className="paper-trade-meta">{trade.setupLabel}</div>
                </div>
                <div className="paper-trade-badge-stack">
                  <span className={`paper-trade-origin ${trade.tradeOrigin === 'system_plan' ? 'origin-system' : 'origin-custom'}`}>
                    {getOriginLabel(trade)}
                  </span>
                  {trade.mode === 'intraday' && (
                    <span className="paper-trade-leverage">
                      {getLeverageLabel(trade)}
                    </span>
                  )}
                  <span className={`paper-trade-status status-${trade.status}`}>{trade.statusLabel}</span>
                </div>
              </div>

              <div className="paper-trade-card-subhead">
                <span className="paper-trade-mode">{getModeLabel(trade)}</span>
                <span className="paper-trade-execution">{trade.executionLabel}</span>
              </div>

              <div className="paper-trade-freeze-note">
                {marketLive
                  ? `Marked live from latest quote`
                  : `Frozen at ${formatStamp(trade.lastUpdated)}`}
              </div>

              <div className="paper-trade-quote-age">
                Last quote: {formatTimeOnly(trade.lastUpdated)}
              </div>

              <div className="paper-trade-stats">
                <div className="paper-stat-tile"><span>Qty</span><strong>{trade.quantity}</strong></div>
                <div className="paper-stat-tile"><span>Entry</span><strong>{formatPrice(trade.entryPrice)}</strong></div>
                <div className="paper-stat-tile"><span>{marketLive ? 'LTP' : 'Last Price'}</span><strong>{formatPrice(trade.lastKnownPrice)}</strong></div>
                <div className="paper-stat-tile"><span>{marketLive ? 'Open PnL' : 'Frozen PnL'}</span><strong className={Number(trade.unrealizedPnl) >= 0 ? 'positive' : 'negative'}>{formatPnl(trade.unrealizedPnl)}</strong></div>
              </div>

              {trade.mode === 'intraday' && (
                <div className="paper-trade-plan">
                  <div className="paper-plan-tile"><span>Leverage</span><strong>{getLeverageLabel(trade)}</strong></div>
                  <div className="paper-plan-tile"><span>Capital Used</span><strong>{formatPrice(trade.capitalUsed)}</strong></div>
                  <div className="paper-plan-tile"><span>Exposure</span><strong>{formatPrice(trade.grossExposure)}</strong></div>
                  <div className="paper-plan-tile"><span>Risk Budget</span><strong>{formatPrice(trade.plannedRiskAmount)}</strong></div>
                </div>
              )}

              <div className="paper-trade-plan">
                <div className="paper-plan-tile"><span>SL</span><strong>{formatPrice(trade.stopLoss)}</strong></div>
                <div className="paper-plan-tile"><span>T1</span><strong>{formatPrice(trade.target1)}</strong></div>
                <div className="paper-plan-tile"><span>T2</span><strong>{formatPrice(trade.target2)}</strong></div>
                <div className="paper-plan-tile"><span>RR</span><strong>1:{trade.riskReward}</strong></div>
              </div>

              {trade.planReason && (
                <div className="paper-trade-plan-note">
                  <strong>Plan:</strong> {trade.planReason}
                </div>
              )}

              {trade.executionReason && (
                <div className="paper-trade-note">{trade.executionReason}</div>
              )}

              <button className="paper-secondary-btn paper-close-btn" onClick={() => onCloseTrade(trade.id)}>
                Close Trade
              </button>
            </div>
          ))}
        </div>
      )}

      {closedTrades.length > 0 && (
        <div className="paper-trades-closed">
          <div className="paper-closed-actions">
            <button className="paper-toggle-btn" onClick={() => setShowClosed((value) => !value)}>
              {showClosed ? 'Hide Closed Trades' : `Show Closed Trades (${closedTrades.length})`}
            </button>
            <button className="paper-danger-btn" onClick={handleClearClosed}>
              Clear Closed Trades
            </button>
          </div>

          {showClosed && (
            <div className="paper-trade-list closed-list">
              {closedTrades.map((trade) => (
                <div key={trade.id} className="paper-trade-card closed">
                  <div className="paper-trade-card-header">
                    <div>
                      <div className="paper-trade-symbol">{trade.symbol}</div>
                      <div className="paper-trade-meta">{getOriginLabel(trade)} · {trade.statusLabel}</div>
                    </div>
                    <strong className={Number(trade.realizedPnl) >= 0 ? 'positive' : 'negative'}>
                      {formatPnl(trade.realizedPnl)}
                    </strong>
                  </div>
                  <button
                    className="paper-danger-btn paper-delete-btn"
                    onClick={() => onDeleteTrade(trade.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
