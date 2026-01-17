import { useEffect, useState } from 'react'
import API from '../services/api'

export default function MarketOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const res = await API.getMarketIndices()
        setData(res.data)
        setError(null)
      } catch (e) {
        console.error('Market overview error', e)
        setError('Failed to load market data')
      } finally {
        setIsLoading(false)
      }
    }

    load()
    const i = setInterval(load, 15000)
    return () => clearInterval(i)
  }, [])

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A'
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const Card = ({ title, d }) => {
    if (!d) return null
    
    const changePct = d.changePct !== null ? d.changePct : 0
    const isPositive = changePct >= 0
    
    return (
      <div className="index-card">
        <span className="index-name">{title}</span>
        
        <div className="index-row"><span>Open</span><span>{formatNumber(d.open)}</span></div>
        <div className="index-row"><span>High</span><span>{formatNumber(d.high)}</span></div>
        <div className="index-row"><span>Low</span><span>{formatNumber(d.low)}</span></div>
        <div className="index-row"><span>Prev</span><span>{formatNumber(d.prevClose)}</span></div>

        {d.changePct !== null && (
          <div className={`index-change ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(changePct).toFixed(2)}%
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="market-panel">
        <h3>Market Snapshot</h3>
        <div className="loading">Loading market data...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="market-panel">
        <h3>Market Snapshot</h3>
        <div className="error">{error || 'Market data unavailable'}</div>
      </div>
    )
  }

  return (
    <div className="market-panel">
      <h3>Market Snapshot</h3>
      <Card title="NIFTY 50" d={data.nifty50} />
      <Card title="BANK NIFTY" d={data.bankNifty} />
      <Card title="SENSEX" d={data.sensex} />
      {data.timestamp && (
        <div className="market-timestamp">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
