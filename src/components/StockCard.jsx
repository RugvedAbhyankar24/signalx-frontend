import React from 'react'

export default function StockCard({ item, onPaperTrade }) {
  const formatPrice = (value) => {
    const n = Number(value)
    return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—'
  }

  const fmtCap = (v) => {
    if (v == null) return '—'
    const abs = Math.abs(v)
    if (abs >= 1e12) return (v / 1e12).toFixed(2) + ' T'
    if (abs >= 1e9) return (v / 1e9).toFixed(2) + ' B'
    if (abs >= 1e7) return (v / 1e7).toFixed(2) + ' Cr'
    return String(v)
  }

  const formatNewsDate = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp * 1000) // Convert from Unix timestamp
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return `${diffInMinutes} min ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  if (item.error) {
    return (
      <div className="card center-card">
        <div className="symbol">{item.normalizedSymbol || item.symbol}</div>
        <div className="pill error">Error</div>
        <p className="muted">{item.error}</p>
      </div>
    )
  }

  const decisionColor =
    item.decision?.label === 'Tradeable'
      ? '#10b981'
      : item.decision?.label === 'Avoid'
      ? '#ef4444'
      : '#f59e0b'

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

  const buildModePresets = () => {
    const currentPrice = Number(item.currentPrice) || 0
    const support = Number(item.support)
    const resistance = Number(item.resistance)
    const manualStop = currentPrice ? currentPrice * 0.97 : 0
    const manualTarget1 = currentPrice ? currentPrice * 1.03 : 0
    const manualTarget2 = currentPrice ? currentPrice * 1.06 : 0

    const intradayStop = currentPrice ? currentPrice * 0.992 : 0
    const intradayTarget1 = currentPrice ? currentPrice * 1.008 : 0
    const intradayTarget2 = currentPrice ? currentPrice * 1.016 : 0

    const swingStop = currentPrice ? currentPrice * 0.955 : 0
    const swingTarget1 = currentPrice ? currentPrice * 1.04 : 0
    const swingTarget2 = currentPrice ? currentPrice * 1.08 : 0

    const customPreset = {
      mode: 'custom',
      tradeOrigin: 'custom',
      setupLabel: item.swingView?.label || item.decision?.label || 'Manual Sandbox Trade',
      executionLabel: 'Manual paper trade',
      entryPrice: currentPrice,
      stopLoss: Number.isFinite(support) && support > 0 && support < currentPrice ? support : manualStop,
      target1: Number.isFinite(resistance) && resistance > currentPrice ? resistance : manualTarget1,
      target2: Number.isFinite(resistance) && resistance > currentPrice ? resistance * 1.03 : manualTarget2,
      planReason: 'Manual paper trade seeded from stock scan levels. You can edit entry, stop, and targets in the simulator.',
      executionReason: item.decision?.reason || 'Use this sandbox to test both profit-making and loss-making trade plans.',
      riskReward: '—',
    }

    const intradayPreset = item.intradayOpportunity?.qualifies
      ? {
          mode: 'intraday',
          tradeOrigin: 'system_plan',
          setupLabel: item.intradayView?.label || 'Intraday setup',
          executionLabel: item.intradayOpportunity?.actionableEntryQuality?.label || 'Qualified',
          entryPrice: item.intradayOpportunity?.entryPrice,
          stopLoss: item.intradayOpportunity?.stopLoss,
          target1: item.intradayOpportunity?.target1,
          target2: item.intradayOpportunity?.target2,
          planReason: item.intradayOpportunity?.entryReason,
          executionReason: item.intradayOpportunity?.actionableEntryQuality?.reason,
          riskReward: item.intradayOpportunity?.riskReward,
        }
      : {
          ...customPreset,
          mode: 'intraday',
          tradeOrigin: 'custom',
          setupLabel: item.intradayView?.label || 'No Clear Intraday Signal',
          executionLabel: 'Not Qualified',
          stopLoss: intradayStop,
          target1: intradayTarget1,
          target2: intradayTarget2,
          planReason: item.intradayOpportunity?.reason || 'No intraday edge right now. Using tighter intraday fallback levels.',
          executionReason: item.intradayOpportunity?.reason || 'No intraday edge right now. Review before execution.',
        }

    const swingPreset = item.swingOpportunity?.qualifies
      ? {
          mode: 'swing',
          tradeOrigin: 'system_plan',
          setupLabel: item.swingView?.label || 'Swing setup',
          executionLabel: item.swingOpportunity?.actionableEntryQuality?.label || 'Qualified',
          entryPrice: item.swingOpportunity?.entryPrice,
          stopLoss: item.swingOpportunity?.stopLoss,
          target1: item.swingOpportunity?.target1,
          target2: item.swingOpportunity?.target2,
          planReason: item.swingOpportunity?.entryReason,
          executionReason: item.swingOpportunity?.actionableEntryQuality?.reason,
          riskReward: item.swingOpportunity?.riskReward,
        }
      : {
          ...customPreset,
          mode: 'swing',
          tradeOrigin: 'custom',
          setupLabel: item.swingView?.label || 'No Swing Opportunity',
          executionLabel: 'Not Qualified',
          stopLoss: Number.isFinite(support) && support > 0 && support < currentPrice ? support : swingStop,
          target1: Number.isFinite(resistance) && resistance > currentPrice ? resistance : swingTarget1,
          target2: Number.isFinite(resistance) && resistance > currentPrice ? resistance * 1.04 : swingTarget2,
          planReason: item.swingOpportunity?.reason || 'No swing edge right now. Using wider swing fallback levels.',
          executionReason: item.swingOpportunity?.reason || 'No swing edge right now. Review structure before execution.',
        }

    return {
      custom: customPreset,
      intraday: intradayPreset,
      swing: swingPreset,
    }
  }

  const launchPaperTrade = (mode) => {
    if (!onPaperTrade) return

    const opportunity = mode === 'intraday' ? item.intradayOpportunity : item.swingOpportunity
    const view = mode === 'intraday' ? item.intradayView : item.swingView

    if (!opportunity?.qualifies) return

    const modePresets = buildModePresets()
    const selectedPreset = modePresets[mode]

    onPaperTrade({
      symbol: item.symbol,
      companyName: item.companyName,
      mode,
      tradeOrigin: selectedPreset.tradeOrigin,
      setupLabel: selectedPreset.setupLabel || view?.label || `${mode} setup`,
      executionLabel: selectedPreset.executionLabel || opportunity?.actionableEntryQuality?.label || 'Qualified',
      entryPrice: selectedPreset.entryPrice ?? opportunity.entryPrice,
      stopLoss: selectedPreset.stopLoss ?? opportunity.stopLoss,
      target1: selectedPreset.target1 ?? opportunity.target1,
      target2: selectedPreset.target2 ?? opportunity.target2,
      currentPrice: item.currentPrice,
      planReason: selectedPreset.planReason || opportunity.entryReason,
      executionReason: selectedPreset.executionReason || opportunity.actionableEntryQuality?.reason,
      riskReward: selectedPreset.riskReward || opportunity.riskReward,
      modePresets,
      source: 'stock_scan',
    })
  }

  const launchCustomPaperTrade = () => {
    if (!onPaperTrade) return

    const modePresets = buildModePresets()
    const selectedPreset = modePresets.custom

    onPaperTrade({
      symbol: item.symbol,
      companyName: item.companyName,
      mode: 'custom',
      tradeOrigin: selectedPreset.tradeOrigin,
      setupLabel: selectedPreset.setupLabel,
      executionLabel: selectedPreset.executionLabel,
      entryPrice: selectedPreset.entryPrice,
      stopLoss: selectedPreset.stopLoss,
      target1: selectedPreset.target1,
      target2: selectedPreset.target2,
      currentPrice: item.currentPrice,
      planReason: selectedPreset.planReason,
      executionReason: selectedPreset.executionReason,
      riskReward: selectedPreset.riskReward,
      modePresets,
      source: 'stock_scan_manual',
    })
  }

  return (
    <div className="card center-card">
      {/* Header */}
      <div className="card-header">
        <div className="symbol">{item.normalizedSymbol || item.symbol}</div>
        <div className="pill">
          RSI {item.rsi} · {item.rsiCategory}
        </div>
      </div>

      {/* Price Data */}
      <div className="section">
        <div className="kv"><span>Prev Close</span><span>{item.prevClose != null ? item.prevClose.toFixed(2) : '—'}</span></div>
        <div className="kv"><span>Open</span><span>{item.open != null ? item.open.toFixed(2) : '—'}</span></div>
        <div className="kv"><span>Current</span><span>{item.currentPrice != null ? item.currentPrice.toFixed(2) : '—'}</span></div>
        <div className="kv"><span>Gap (Open)</span><span>{item.gapOpenPct != null ? item.gapOpenPct.toFixed(2) : '—'}%</span></div>
        <div className="kv"><span>Gap (Now)</span><span>{item.gapNowPct != null ? item.gapNowPct.toFixed(2) : '—'}%</span></div>
      </div>

      {/* News */}
      {Array.isArray(item.newsItems) && item.newsItems.length > 0 && (
        <div className="section">
          <div className="section-title">📰 News</div>
          {item.newsItems.slice(0, 5).map((n, i) => (
            <div key={i} className="news-item">
              <a className="link" href={n.url} target="_blank" rel="noreferrer">
                {n.headline}
              </a>
              <div className="news-meta">
                {n.source && <span className="muted">{n.source}</span>}
                {n.datetime && (
                  <span className="muted">
                    {' — '}
                    {formatNewsDate(n.datetime)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="section">
  <div className="section-title">📊 Market Data</div>

  <div className="kv">
    <span>Company</span>
    <span style={{ fontWeight: 600 }}>
      {item.companyName || item.symbol}
    </span>
  </div>

  <div className="kv">
    <span>Market Cap</span>
    <span>{fmtCap(item.marketCap)}</span>
  </div>
</div>
<div className="section">
  <div className="section-title">📐 Technical Signals</div>

  <div className="kv">
    <span>VWAP</span>
    <span>{item.vwap ?? '—'}</span>
  </div>

  <div className="kv">
    <span>Volume Spike</span>
    <span>{item.volume?.volumeSpike ? 'Yes 🔥' : 'No'}</span>
  </div>

  <div className="kv">
    <span>Support</span>
    <span>{item.support?.toFixed(2)}</span>
  </div>

  <div className="kv">
    <span>Resistance</span>
    <span>{item.resistance?.toFixed(2)}</span>
  </div>

  <div className="kv">
    <span>Breakout</span>
    <span>{item.breakout ? 'Yes 🚀' : 'No'}</span>
  </div>
</div>



      {/* Decision */}
      {/* Decision */}
<div className="section decision-box">
  <div className="section-title">📌 Trade Decision</div>

  <div className="decision-actions">
    <button className="paper-trade-btn" onClick={launchCustomPaperTrade}>
      New Paper Trade
    </button>
  </div>

  <div className="kv">
    <span>Status</span>
    <span style={{ color: decisionColor, fontWeight: 600 }}>
      {item.decision?.icon} {item.decision?.label}
    </span>
  </div>

  <div className="kv">
    <span>Final Sentiment</span>
   <span
  className={`sentiment sentiment-${item.decision?.sentiment}`}
>
  {item.decision?.icon} {item.decision?.sentiment?.toUpperCase()}
</span>

  </div>

  <div className="kv">
    <span>Reason</span>
    <span className="muted">{item.decision?.reason}</span>
  </div>

  <div className="kv">
    <span>RSI</span>
    <span>
      {item.rsi} ({item.rsiCategory})
    </span>
  </div>

  <div className="kv">
    <span>Gap (Now)</span>
    <span>{item.gapNowPct?.toFixed(2)}%</span>
  </div>

  {item.newsSentiment && (
    <div className="kv">
      <span>News Tone</span>
      <span className="muted">{item.newsSentiment}</span>
    </div>
  )}
</div>
      <div className="section opportunity-section">
  <div className="section-title">🎯 Opportunity Views</div>

  <div className="kv opportunity-header-row">
    <span>Intraday Execution</span>
    <span className={`pill ${item.intradayOpportunity?.qualifies ? 'pill-success' : 'pill-muted'}`}>
      {item.intradayOpportunity?.qualifies ? item.intradayView?.label : 'Not Qualified'}
    </span>
  </div>

  {item.intradayOpportunity?.qualifies ? (
    <>
      <div className="opportunity-actions">
        <button className="paper-trade-btn" onClick={() => launchPaperTrade('intraday')}>
          Use Intraday Plan
        </button>
      </div>
      <div className="kv"><span>Intraday Action</span><span className={`entry-quality-text ${getActionableToneClass(item.intradayOpportunity?.actionableEntryQuality)}`}>{item.intradayOpportunity?.actionableEntryQuality?.label || '—'}</span></div>
      <div className="kv"><span>Entry / SL</span><span>{formatPrice(item.intradayOpportunity?.entryPrice)} / {formatPrice(item.intradayOpportunity?.stopLoss)}</span></div>
      <div className="kv"><span>T1 / T2</span><span>{formatPrice(item.intradayOpportunity?.target1)} / {formatPrice(item.intradayOpportunity?.target2)}</span></div>
      <div className="kv"><span>RR</span><span>{item.intradayOpportunity?.riskReward || '—'}</span></div>
      <div className="kv"><span>Plan</span><span className="muted">{item.intradayOpportunity?.entryReason}</span></div>
    </>
  ) : (
    <div className="inline-reasons compact-reasons">
      <div>• {item.intradayOpportunity?.reason || 'No intraday edge right now'}</div>
    </div>
  )}

  <div className="kv opportunity-header-row">
    <span>Swing Thesis</span>
    <span className="pill pill-info">
      {item.swingView?.label}
    </span>
  </div>

  {item.swingView?.reasons && (
    <div className="inline-reasons compact-reasons">
      {item.swingView.reasons.map((r, i) => (
        <div key={i}>• {r}</div>
      ))}
    </div>
  )}

  <div className="kv opportunity-header-row">
    <span>Swing Execution</span>
    <span className={`pill ${item.swingOpportunity?.qualifies ? 'pill-success' : 'pill-muted'}`}>
      {item.swingOpportunity?.qualifies ? item.swingOpportunity?.actionableEntryQuality?.label || 'Qualified' : 'Not Qualified'}
    </span>
  </div>

  {item.swingOpportunity?.qualifies ? (
    <div className="opportunity-detail-block">
      <div className="opportunity-actions">
        <button className="paper-trade-btn" onClick={() => launchPaperTrade('swing')}>
          Use Swing Plan
        </button>
      </div>
      <div className="kv"><span>Entry / SL</span><span>{formatPrice(item.swingOpportunity?.entryPrice)} / {formatPrice(item.swingOpportunity?.stopLoss)}</span></div>
      <div className="kv"><span>T1 / T2</span><span>{formatPrice(item.swingOpportunity?.target1)} / {formatPrice(item.swingOpportunity?.target2)}</span></div>
      <div className="kv"><span>RR</span><span>{item.swingOpportunity?.riskReward || '—'}</span></div>
      <div className="kv"><span>Plan</span><span className="muted value-note">{item.swingOpportunity?.entryReason}</span></div>
    </div>
  ) : (
    <div className="inline-reasons compact-reasons">
      <div>• {item.swingOpportunity?.reason || 'No swing edge right now'}</div>
    </div>
  )}

  {item.swingOpportunity?.qualifies && item.swingOpportunity?.actionableEntryQuality?.reason && (
    <div className={`execution-note-card ${getActionableToneClass(item.swingOpportunity?.actionableEntryQuality)}`}>
      <div className="execution-note-label">Execution Note</div>
      <div className="execution-note-copy">
        {item.swingOpportunity.actionableEntryQuality.reason}
      </div>
    </div>
  )}

  <div className="kv opportunity-header-row">
    <span>Long-Term Thesis</span>
    <span className="pill pill-info">
      {item.longTermView?.label}
    </span>
  </div>

  {item.longTermView?.reasons && (
    <div className="inline-reasons compact-reasons">
      {item.longTermView.reasons.map((r, i) => (
        <div key={i}>• {r}</div>
      ))}
    </div>
  )}
</div>


    </div>
  )
}
