import React from 'react'

export default function StockCard({ item }) {
  const fmtCap = (v) => {
    if (v == null) return '—'
    const abs = Math.abs(v)
    if (abs >= 1e12) return (v / 1e12).toFixed(2) + ' T'
    if (abs >= 1e9) return (v / 1e9).toFixed(2) + ' B'
    if (abs >= 1e7) return (v / 1e7).toFixed(2) + ' Cr'
    return String(v)
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
              {n.source && <span className="muted"> — {n.source}</span>}
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
<div className="section">
  <div className="section-title">🎢 Swing / Long Term View</div>

  <div className="kv">
    <span>Swing</span>
    <span className="pill pill-info">
      {item.swingView?.label}
    </span>
  </div>

  {item.swingView?.reasons && (
    <div className="inline-reasons">
      {item.swingView.reasons.map((r, i) => (
        <div key={i}>• {r}</div>
      ))}
    </div>
  )}

  <div className="kv">
    <span>Long Term</span>
    <span className="pill pill-info">
      {item.longTermView?.label}
    </span>
  </div>

  {item.longTermView?.reasons && (
    <div className="inline-reasons">
      {item.longTermView.reasons.map((r, i) => (
        <div key={i}>• {r}</div>
      ))}
    </div>
  )}
</div>


    </div>
  )
}
