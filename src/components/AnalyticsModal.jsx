import React from 'react'
import './AnalyticsModal.css'
import PaperTradingDashboard from './PaperTradingDashboard'

export default function AnalyticsModal({ trades, onClose }) {
  return (
    <div className="analytics-modal-backdrop" onClick={onClose}>
      <div className="analytics-modal" onClick={(event) => event.stopPropagation()}>
        <div className="analytics-modal-header">
          <div>
            <div className="analytics-modal-eyebrow">Performance Analytics</div>
            <h3>📊 Paper Trading Dashboard</h3>
            <p>Comprehensive analysis of your paper trading performance with advanced metrics and visualizations.</p>
          </div>
          <button className="analytics-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="analytics-modal-body">
          <PaperTradingDashboard trades={trades} />
        </div>

        <div className="analytics-modal-footer">
          <button className="analytics-secondary-btn" onClick={onClose}>
            Close Analytics
          </button>
        </div>
      </div>
    </div>
  )
}
