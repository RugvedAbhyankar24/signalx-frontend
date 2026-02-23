import React, { useEffect, useMemo, useState } from 'react'
import API from '../services/api'

const getCurrentISTDate = () => {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const y = ist.getFullYear()
  const m = String(ist.getMonth() + 1).padStart(2, '0')
  const d = String(ist.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const toMoney = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'N/A'
  return `Rs ${n.toFixed(2)}`
}

const toPct = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'N/A'
  return `${n.toFixed(2)}%`
}

const verdictLabel = (value) => {
  if (value === 'working') return 'Working'
  if (value === 'mixed_refine') return 'Mixed - Refine'
  if (value === 'needs_refinement') return 'Needs Refinement'
  return 'Insufficient Data'
}

const IntradayBacktestPanel = () => {
  const [tradeDate, setTradeDate] = useState(getCurrentISTDate())
  const [capital, setCapital] = useState('10000')
  const [allocationMode, setAllocationMode] = useState('per_pick')

  const [snapshots, setSnapshots] = useState([])
  const [fallbackSnapshots, setFallbackSnapshots] = useState([])
  const [runs, setRuns] = useState([])
  const [latestRun, setLatestRun] = useState(null)

  const [loadingSnapshots, setLoadingSnapshots] = useState(false)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const selectedSnapshot = useMemo(
    () => (snapshots.length ? snapshots[0] : null),
    [snapshots]
  )

  const latestAvailableSnapshot = useMemo(
    () => (fallbackSnapshots.length ? fallbackSnapshots[0] : null),
    [fallbackSnapshots]
  )

  const loadSnapshots = async () => {
    setLoadingSnapshots(true)
    try {
      const res = await API.getIntradayBacktestSnapshots({ date: tradeDate, limit: 100 })
      const list = res?.data?.snapshots || []
      setSnapshots(list)
      if (!list.length) {
        const fallbackRes = await API.getIntradayBacktestSnapshots({ limit: 100 })
        setFallbackSnapshots(fallbackRes?.data?.snapshots || [])
      } else {
        setFallbackSnapshots([])
      }
    } catch (e) {
      console.error('Failed to load backtest snapshots', e)
      setSnapshots([])
      setFallbackSnapshots([])
    } finally {
      setLoadingSnapshots(false)
    }
  }

  const loadRuns = async () => {
    setLoadingRuns(true)
    try {
      const res = await API.getIntradayBacktestRuns({ date: tradeDate, limit: 20 })
      setRuns(res?.data?.runs || [])
    } catch (e) {
      console.error('Failed to load backtest runs', e)
      setRuns([])
    } finally {
      setLoadingRuns(false)
    }
  }

  useEffect(() => {
    loadSnapshots()
    loadRuns()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeDate])

  const runBacktest = async () => {
    setError(null)
    setLatestRun(null)

    const numericCapital = Number(capital)
    if (!Number.isFinite(numericCapital) || numericCapital <= 0) {
      setError('Capital must be a positive number.')
      return
    }

    setRunning(true)
    try {
      const payload = {
        date: tradeDate,
        capital: numericCapital,
        allocationMode
      }

      const res = await API.runIntradayBacktest(payload)
      const run = res?.data?.backtest || null
      setLatestRun(run)
      await loadRuns()
    } catch (e) {
      const message = e?.response?.data?.error || e?.message || 'Backtest run failed'
      setError(message)
    } finally {
      setRunning(false)
    }
  }

  const summary = latestRun?.summary || null
  const trades = latestRun?.trades || []
  const hasSnapshots = snapshots.length > 0
  const setupPerformance = summary?.setupPerformance || []
  const lossReasons = summary?.lossReasons || []

  return (
    <div className="intraday-backtest-container">
      <div className="intraday-backtest-header">
        <h2>Intraday Backtest</h2>
        <p>Replay generated intraday picks vs real candles (09:15 to 15:30 IST).</p>
      </div>

      <div className="intraday-backtest-controls">
        <label>
          Trade Date
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
          />
        </label>

        <label>
          Capital (Rs)
          <input
            type="number"
            min="1"
            step="1"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            placeholder="10000"
          />
        </label>

        <label>
          Allocation
          <select
            value={allocationMode}
            onChange={(e) => setAllocationMode(e.target.value)}
          >
            <option value="per_pick">Per Pick Capital</option>
            <option value="split_across_picks">Split Across Picks</option>
          </select>
        </label>
      </div>

      <div className="intraday-backtest-actions">
        <button
          className="run-backtest-btn"
          onClick={runBacktest}
          disabled={running || loadingSnapshots || !hasSnapshots}
          title={!hasSnapshots ? 'Select a date that has saved intraday snapshots' : ''}
        >
          {running ? 'Running...' : 'Run Backtest'}
        </button>
      </div>

      <div className="intraday-backtest-meta">
        <span>{loadingSnapshots ? 'Loading snapshots...' : `Snapshots: ${snapshots.length}`}</span>
        <span>{loadingRuns ? 'Loading runs...' : `Previous Runs: ${runs.length}`}</span>
        {selectedSnapshot && (
          <span>
            Using Best Snapshot: {selectedSnapshot.istDate} {selectedSnapshot.istTime} | Picks {selectedSnapshot.positiveCount}
          </span>
        )}
      </div>

      {error && (
        <div className="intraday-backtest-error">
          {error}
        </div>
      )}

      {!loadingSnapshots && !hasSnapshots && (
        <div className="intraday-backtest-empty">
          <div className="intraday-backtest-empty-title">No snapshot for selected date ({tradeDate})</div>
          <div className="intraday-backtest-empty-body">
            Backtest works only on real saved intraday picks for that trading day.
          </div>
          {latestAvailableSnapshot && (
            <div className="intraday-backtest-empty-cta">
              <span>
                Latest available snapshot: {latestAvailableSnapshot.istDate} {latestAvailableSnapshot.istTime}
              </span>
              <button
                className="run-backtest-btn"
                onClick={() => setTradeDate(latestAvailableSnapshot.istDate)}
              >
                Use Latest Date
              </button>
            </div>
          )}
        </div>
      )}

      {summary && (
        <div className="intraday-backtest-summary-grid">
          <div className="intraday-backtest-summary-card">
            <div className="k">Total Signals</div>
            <div className="v">{summary.totalSignals}</div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">Closed Trades</div>
            <div className="v">{summary.tradesClosed}</div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">Win Rate</div>
            <div className="v">{toPct(summary.winRate)}</div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">Accuracy (W/L)</div>
            <div className="v">{toPct(summary.recommendationAccuracyPct)}</div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">Net P/L</div>
            <div className={`v ${Number(summary.netPnl) >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
              {toMoney(summary.netPnl)}
            </div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">ROI (Configured)</div>
            <div className={`v ${Number(summary.roiOnConfiguredExposurePct) >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
              {toPct(summary.roiOnConfiguredExposurePct)}
            </div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">Decision Verdict</div>
            <div className={`v ${
              summary.recommendationVerdict === 'working'
                ? 'pnl-pos'
                : summary.recommendationVerdict === 'needs_refinement'
                ? 'pnl-neg'
                : ''
            }`}
            >
              {verdictLabel(summary.recommendationVerdict)}
            </div>
          </div>
          <div className="intraday-backtest-summary-card">
            <div className="k">No Trade</div>
            <div className="v">{summary.noTrade}</div>
          </div>
        </div>
      )}

      {summary && (setupPerformance.length > 0 || lossReasons.length > 0) && (
        <div className="intraday-backtest-diagnostics">
          {setupPerformance.length > 0 && (
            <div className="intraday-backtest-diag-card">
              <h3>Setup Performance</h3>
              <div className="intraday-backtest-diag-list">
                {setupPerformance.map(s => (
                  <div key={s.entryType} className="intraday-backtest-diag-row">
                    <span>{s.entryType}</span>
                    <span>W:{s.wins} L:{s.losses} N:{s.noTrade}</span>
                    <span>{toPct(s.winRate)}</span>
                    <span className={Number(s.netPnl) >= 0 ? 'pnl-pos' : 'pnl-neg'}>{toMoney(s.netPnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lossReasons.length > 0 && (
            <div className="intraday-backtest-diag-card">
              <h3>Top Loss Reasons</h3>
              <div className="intraday-backtest-diag-list">
                {lossReasons.map(item => (
                  <div key={item.reason} className="intraday-backtest-diag-row">
                    <span>{item.reason}</span>
                    <span>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {trades.length > 0 && (
        <div className="intraday-backtest-trades">
          <h3>Latest Run Trades</h3>
          <div className="intraday-backtest-trades-table-wrap">
            <table className="intraday-backtest-trades-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Outcome</th>
                  <th>Entry</th>
                  <th>Entry Time</th>
                  <th>Exit</th>
                  <th>Exit Time</th>
                  <th>Interval</th>
                  <th>Qty</th>
                  <th>Net P/L</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, idx) => (
                  <tr key={`${t.symbol}-${idx}`}>
                    <td>{t.symbol}</td>
                    <td className={t.outcome === 'win' ? 'pnl-pos' : t.outcome === 'loss' ? 'pnl-neg' : ''}>
                      {t.outcome}
                    </td>
                    <td>{toMoney(t.entryPrice)}</td>
                    <td>{t.entryTriggeredAt || 'N/A'}</td>
                    <td>{t.exitPrice != null ? toMoney(t.exitPrice) : 'N/A'}</td>
                    <td>{t.exitTriggeredAt || 'N/A'}</td>
                    <td>{t.candleInterval || 'N/A'}</td>
                    <td>{t.quantity || 0}</td>
                    <td className={Number(t.netPnl) >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                      {toMoney(t.netPnl)}
                    </td>
                    <td>{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default IntradayBacktestPanel
