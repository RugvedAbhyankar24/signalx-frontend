import React, { useMemo, useState } from 'react'
import './PaperTradingDashboard.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { BarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
)

const formatPrice = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—'
}


const formatSharpeRatio = (value) => {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0.00'
  return value.toFixed(2)
}



const formatPercent = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '—'
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  gray: '#6b7280'
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
]

export default function PaperTradingDashboard({ trades }) {
  const [selectedTradeType, setSelectedTradeType] = useState('all') // 'all', 'intraday', 'swing'
  
  const analytics = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        dailyEquity: [],
        tradeDistribution: [],
        winRateBySetup: [],
        riskRewardHistogram: [],
        summary: {
          totalTrades: 0,
          winRate: 0,
          totalPnl: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0
        }
      }
    }

    // Filter trades by type
    const filteredTrades = selectedTradeType === 'all' 
      ? trades 
      : trades.filter(trade => trade.mode === selectedTradeType)

    const closedTrades = filteredTrades.filter(trade => String(trade.status).startsWith('closed'))

    // Daily Equity Curve Calculation
    const dailyEquityMap = new Map()
    let runningEquity = 100000 // Starting capital
    dailyEquityMap.set(new Date().toISOString().split('T')[0], runningEquity)

    // Sort trades by date
    const sortedTrades = [...closedTrades].sort((a, b) => {
      const aTime = new Date(a.closedAt || a.lastUpdated || 0).getTime()
      const bTime = new Date(b.closedAt || b.lastUpdated || 0).getTime()
      return aTime - bTime
    })

    sortedTrades.forEach(trade => {
      const date = new Date(trade.closedAt || trade.lastUpdated).toISOString().split('T')[0]
      runningEquity += Number(trade.realizedPnl || 0)
      dailyEquityMap.set(date, runningEquity)
    })

    const dailyEquity = Array.from(dailyEquityMap.entries())
      .map(([date, equity]) => ({
        date,
        equity,
        returns: ((equity - 100000) / 100000) * 100
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Trade Distribution by Setup
    const setupMap = new Map()
    closedTrades.forEach(trade => {
      const setup = trade.setupLabel || 'Unknown'
      if (!setupMap.has(setup)) {
        setupMap.set(setup, { wins: 0, losses: 0, total: 0, pnl: 0 })
      }
      const data = setupMap.get(setup)
      data.total++
      data.pnl += Number(trade.realizedPnl || 0)
      if (Number(trade.realizedPnl) > 0) {
        data.wins++
      } else {
        data.losses++
      }
    })

    const tradeDistribution = Array.from(setupMap.entries()).map(([setup, data]) => ({
      setup,
      trades: data.total,
      wins: data.wins,
      losses: data.losses,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      pnl: data.pnl,
      avgPnl: data.total > 0 ? data.pnl / data.total : 0
    })).sort((a, b) => b.trades - a.trades)

    // Win Rate by Setup
    const winRateBySetup = tradeDistribution.map(item => ({
      setup: item.setup,
      winRate: item.winRate,
      trades: item.trades
    }))

    // Risk:Reward Histogram
    const riskRewards = closedTrades.map(trade => ({
      symbol: trade.symbol,
      riskReward: Number(trade.riskReward) || 1,
      pnl: Number(trade.realizedPnl) || 0,
      setup: trade.setupLabel || 'Unknown'
    })).filter(trade => Number.isFinite(trade.riskReward))

    const rrBuckets = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5]
    const riskRewardHistogram = rrBuckets.map((bucket, index) => {
      const nextBucket = rrBuckets[index + 1] || Infinity
      const trades = riskRewards.filter(rr => rr.riskReward >= bucket && rr.riskReward < nextBucket)
      const wins = trades.filter(t => t.pnl > 0).length
      const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
      
      return {
        range: index === rrBuckets.length - 1 ? `${bucket}+` : `${bucket}-${nextBucket}`,
        count: trades.length,
        wins,
        losses: trades.length - wins,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        avgPnl: trades.length > 0 ? totalPnl / trades.length : 0
      }
    }).filter(bucket => bucket.count > 0)

    // Summary Statistics
    const wins = closedTrades.filter(t => Number(t.realizedPnl) > 0)
    const losses = closedTrades.filter(t => Number(t.realizedPnl) < 0)
    const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.realizedPnl || 0), 0)
    const totalWins = wins.reduce((sum, t) => sum + Number(t.realizedPnl || 0), 0)
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + Number(t.realizedPnl || 0), 0))
    
    // Calculate daily returns for Sharpe ratio
    const dailyReturns = dailyEquity.slice(1).map((day, index) => {
      const prevEquity = dailyEquity[index].equity
      return ((day.equity - prevEquity) / prevEquity) * 100
    })
    
    // Improved Sharpe calculation with better handling for limited data
    let sharpeRatio = 0
    if (dailyReturns.length > 0) {
      const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
      const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length
      const stdDev = Math.sqrt(variance)
      
      // Use annualization factor based on data points available
      const annualizationFactor = dailyReturns.length >= 20 ? Math.sqrt(252) : Math.sqrt(dailyReturns.length * 12)
      sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * annualizationFactor : 0
    }

    // Calculate max drawdown
    let peakEquity = 100000
    let maxDrawdown = 0
    let maxDrawdownPercent = 0
    
    for (const day of dailyEquity) {
      // Update peak if this is a new high
      if (day.equity > peakEquity) {
        peakEquity = day.equity
      }
      // Calculate drawdown from peak
      const currentDrawdown = peakEquity - day.equity
      const currentDrawdownPercent = (currentDrawdown / peakEquity) * 100
      
      // Update max drawdown if this is worse
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown
        maxDrawdownPercent = currentDrawdownPercent
      }
    }

    // Calculate total return percentage using actual P&L
    const totalReturnPercent = (totalPnl / 100000) * 100

    return {
      dailyEquity,
      tradeDistribution,
      winRateBySetup,
      riskRewardHistogram,
      summary: {
        totalTrades: closedTrades.length,
        winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
        totalPnl,
        avgWin: wins.length > 0 ? totalWins / wins.length : 0,
        avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
        sharpeRatio,
        maxDrawdown,
        maxDrawdownPercent,
        totalReturnPercent
      }
    }
  }, [trades, selectedTradeType])

  if (!trades || trades.length === 0) {
    return (
      <div className="paper-trading-dashboard empty">
        <div className="dashboard-empty-state">
          <h4>📊 Paper Trading Analytics</h4>
          <p>Start paper trading to see your performance analytics and charts here.</p>
        </div>
      </div>
    )
  }

  // Daily Equity Curve Chart Config
  const equityChartData = {
    labels: analytics.dailyEquity.map(d => new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Portfolio Equity',
        data: analytics.dailyEquity.map(d => d.equity),
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}20`,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  }

  const equityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => [`Equity: ${formatPrice(context.parsed.y)}`]
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => formatPrice(value),
          color: '#d1d5db'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#d1d5db'
        },
        grid: {
          display: false
        }
      }
    }
  }

  // Win Rate by Setup Chart Config
  const winRateChartData = {
    labels: analytics.winRateBySetup.map(d => d.setup),
    datasets: [
      {
        label: 'Win Rate %',
        data: analytics.winRateBySetup.map(d => d.winRate),
        backgroundColor: analytics.winRateBySetup.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4
      }
    ]
  }

  const winRateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => [
            `Win Rate: ${formatPercent(context.parsed.y)}`,
            `Trades: ${analytics.winRateBySetup[context.dataIndex].trades}`
          ]
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
          color: '#d1d5db'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#d1d5db'
        },
        grid: {
          display: false
        }
      }
    }
  }

  // Risk:Reward Histogram Config
  const rrHistogramData = analytics.riskRewardHistogram.map(bucket => ({
    range: bucket.range,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate: bucket.winRate
  }))

  // Calculate filtered trades count for display
  const filteredTradesCount = selectedTradeType === 'all' 
    ? trades?.length || 0 
    : trades?.filter(trade => trade.mode === selectedTradeType)?.length || 0

  return (
    <div className="paper-trading-dashboard">
      {/* Trade Type Filter */}
      <div className="dashboard-header-controls">
        <div className="trade-type-filter">
          <label className="filter-label">Trade Type:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${selectedTradeType === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedTradeType('all')}
            >
              All Trades
            </button>
            <button
              className={`filter-btn ${selectedTradeType === 'intraday' ? 'active' : ''}`}
              onClick={() => setSelectedTradeType('intraday')}
            >
              Intraday
            </button>
            <button
              className={`filter-btn ${selectedTradeType === 'swing' ? 'active' : ''}`}
              onClick={() => setSelectedTradeType('swing')}
            >
              Swing
            </button>
          </div>
        </div>
        <div className="trade-summary-info">
          <span className="trade-count">
            Showing {filteredTradesCount} of {trades?.length || 0} trades
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-summary-grid">
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <div className="summary-label">Total P&L</div>
            <div className={`summary-value ${analytics.summary.totalPnl >= 0 ? 'positive' : 'negative'}`}>
              {formatPrice(analytics.summary.totalPnl)}
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">🎯</div>
          <div className="summary-content">
            <div className="summary-label">Win Rate</div>
            <div className="summary-value">{formatPercent(analytics.summary.winRate)}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Total Trades</div>
            <div className="summary-value">{analytics.summary.totalTrades}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">�</div>
          <div className="summary-content">
            <div className="summary-label">Total Return %</div>
            <div className="summary-value positive">
              {analytics.summary.totalReturnPercent.toFixed(2)}%
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📏</div>
          <div className="summary-content">
            <div className="summary-label">Sharpe Ratio</div>
            <div className="summary-value">{formatSharpeRatio(analytics.summary.sharpeRatio)}</div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">Avg Win / Loss</div>
            <div className="summary-value">
              {formatPrice(analytics.summary.avgWin)} / {formatPrice(analytics.summary.avgLoss)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-charts-grid">
        {/* Daily Equity Curve */}
        <div className="chart-card">
          <h3>Daily Equity Curve</h3>
          <div className="chart-container">
            <div className="canvas-container">
              <Line data={equityChartData} options={equityChartOptions} />
            </div>
          </div>
        </div>

        {/* Trade Distribution */}
        <div className="chart-card">
          <h3>Trade Distribution by Setup</h3>
          <div className="chart-container" style={{ backgroundColor: '#2a2e3a', borderRadius: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.tradeDistribution} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="setup" 
                  tick={{ fill: '#f9fafb', fontSize: 12 }}
                  angle={0}
                  textAnchor="middle"
                  height={80}
                />
                <YAxis tick={{ fill: '#f9fafb' }} />
                <RechartsTooltip 
                  formatter={(value, name) => [
                    name === 'trades' ? value : formatPrice(value),
                    name === 'trades' ? 'Trades' : name === 'pnl' ? 'Total P&L' : 'Avg P&L'
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#2a2e3a', 
                    border: '1px solid #3b404d',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <RechartsBar dataKey="trades" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win Rate by Setup */}
        <div className="chart-card">
          <h3>Win Rate by Setup</h3>
          <div className="chart-container">
            <div className="canvas-container">
              <Bar data={winRateChartData} options={winRateChartOptions} />
            </div>
          </div>
        </div>

        {/* Risk:Reward Histogram */}
        <div className="chart-card">
          <h3>Risk:Reward Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rrHistogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: '#d1d5db' }}
                />
                <YAxis tick={{ fill: '#d1d5db' }} />
                <RechartsTooltip 
                  formatter={(value, name) => [
                    value,
                    name === 'wins' ? 'Wins' : name === 'losses' ? 'Losses' : 'Win Rate %'
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#2a2e3a', 
                    border: '1px solid #3b404d',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                />
                <RechartsBar dataKey="wins" stackId="a" fill={COLORS.success} />
                <RechartsBar dataKey="losses" stackId="a" fill={COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="performance-table-card">
        <h3>Setup Performance Breakdown</h3>
        <div className="performance-table">
          <table>
            <thead>
              <tr>
                <th>Setup</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Total P&L</th>
                <th>Avg P&L</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {analytics.tradeDistribution.map((setup) => (
                <tr key={setup.setup}>
                  <td>{setup.setup}</td>
                  <td>{setup.trades}</td>
                  <td className={setup.winRate >= 50 ? 'positive' : 'negative'}>
                    {formatPercent(setup.winRate)}
                  </td>
                  <td className={setup.pnl >= 0 ? 'positive' : 'negative'}>
                    {formatPrice(setup.pnl)}
                  </td>
                  <td className={setup.avgPnl >= 0 ? 'positive' : 'negative'}>
                    {formatPrice(setup.avgPnl)}
                  </td>
                  <td>
                    <div className="performance-bar">
                      <div 
                        className="performance-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, setup.winRate))}%`,
                          backgroundColor: setup.winRate >= 50 ? COLORS.success : COLORS.danger
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
