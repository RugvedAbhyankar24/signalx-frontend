import { useEffect, useState } from 'react'
import API from '../services/api'
import { isMarketLive } from '../utils/marketUtils'

export default function MarketTicker() {
  const [indices, setIndices] = useState([])
  const [gainers, setGainers] = useState([])
  const [losers, setLosers] = useState([])

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await API.getTicker({ signal: controller.signal })
        setIndices(res.data.indices || [])
        setGainers(res.data.gainers || [])
        setLosers(res.data.losers || [])
      } catch (e) {
        if (e.name === 'CanceledError' || e.name === 'AbortError' || e.code === 'ERR_CANCELED') return
        console.error('[ticker] load failed:', e.message)
      }
    }

    // Always load once on mount to show last-known data
    load()
    // Only poll during live NSE trading hours (skips weekends + holidays)
    if (!isMarketLive()) return () => controller.abort()
    const i = setInterval(load, 60000)
    return () => { controller.abort(); clearInterval(i) }
  }, [])

  if (!indices.length) return null

return (
  <div className="ticker">
    <div className="ticker-track">
      
      {/* ===== COPY 1 ===== */}
      <div className="ticker-content">
        <span className="ticker-label">📊 MARKET</span>

        {indices.map(i => {
          const pct = typeof i.changePct === 'number' ? i.changePct : null
          const dir = pct == null ? 'neutral' : pct >= 0 ? 'up' : 'down'

          return (
            <span key={i.name} className={`ticker-item ${dir}`}>
              <strong>{i.name}</strong>

              <span className="ticker-value">
  {i.last?.toLocaleString()}
</span>

<span className="ticker-divider">|</span>

<span className="ticker-pct">
  {pct != null
    ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
    : '—'}
</span>

            </span>
          )
        })}

        {gainers.length > 0 && (
          <>
            <span className="ticker-sep">|</span>
            <span className="ticker-label">🔥 TOP GAINERS</span>
            {gainers.map(s => (
              <span key={s.symbol} className="ticker-item up">
                {s.symbol}
                <span className="ticker-value">
                  {s.price.toLocaleString()}
                </span>
                <span className="ticker-pct">
                  +{s.changePct.toFixed(2)}%
                </span>
              </span>
            ))}
          </>
        )}

        {losers.length > 0 && (
          <>
            <span className="ticker-sep">|</span>
            <span className="ticker-label">🔻 TOP LOSERS</span>
            {losers.map(s => (
              <span key={s.symbol} className="ticker-item down">
                {s.symbol}
                <span className="ticker-value">
                  {s.price.toLocaleString()}
                </span>
                <span className="ticker-pct">
                  {s.changePct.toFixed(2)}%
                </span>
              </span>
            ))}
          </>
        )}
      </div>

      {/* ===== COPY 2 (IDENTICAL) ===== */}
      <div className="ticker-content">
        <span className="ticker-label">📊 MARKET</span>

        {indices.map(i => {
          const pct = typeof i.changePct === 'number' ? i.changePct : null
          const dir = pct == null ? 'neutral' : pct >= 0 ? 'up' : 'down'

          return (
            <span key={`dup-${i.name}`} className={`ticker-item ${dir}`}>
              <strong>{i.name}</strong>

              <span className="ticker-value">
                {i.last?.toLocaleString()}
              </span>

              <span className="ticker-pct">
                {pct != null
                  ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`
                  : '—'}
              </span>
            </span>
          )
        })}

        {gainers.length > 0 && (
          <>
            <span className="ticker-sep">|</span>
            <span className="ticker-label">🔥 TOP GAINERS</span>
            {gainers.map(s => (
              <span key={`dup-${s.symbol}`} className="ticker-item up">
                {s.symbol}
                <span className="ticker-value">
                  {s.price.toLocaleString()}
                </span>
                <span className="ticker-pct">
                  +{s.changePct.toFixed(2)}%
                </span>
              </span>
            ))}
          </>
        )}

        {losers.length > 0 && (
          <>
            <span className="ticker-sep">|</span>
            <span className="ticker-label">🔻 TOP LOSERS</span>
            {losers.map(s => (
              <span key={`dup-${s.symbol}`} className="ticker-item down">
                {s.symbol}
                <span className="ticker-value">
                  {s.price.toLocaleString()}
                </span>
                <span className="ticker-pct">
                  {s.changePct.toFixed(2)}%
                </span>
              </span>
            ))}
          </>
        )}
      </div>

    </div>
  </div>
)

}
