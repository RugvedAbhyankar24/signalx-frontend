import React, { useMemo, useState } from 'react'
import { derivePaperTradeQuantity, deriveRiskReward, validateLongTradeLevels } from '../utils/paperTrading'

const roundPriceValue = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
}

const formatPrice = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—'
}

export default function PaperTradeModal({ draft, onClose, onConfirm }) {
  const [capital, setCapital] = useState(100000)
  const [riskPercent, setRiskPercent] = useState(1)
  const initialMode = draft?.mode || 'custom'
  const initialPreset = (draft?.modePresets && draft.modePresets[initialMode]) || draft
  const [mode, setMode] = useState(initialMode)
  const [allowOverrides, setAllowOverrides] = useState(initialMode === 'custom')
  const [entryPrice, setEntryPrice] = useState(roundPriceValue(initialPreset?.entryPrice || draft?.currentPrice))
  const [stopLoss, setStopLoss] = useState(roundPriceValue(initialPreset?.stopLoss))
  const [target1, setTarget1] = useState(roundPriceValue(initialPreset?.target1))
  const [target2, setTarget2] = useState(roundPriceValue(initialPreset?.target2))
  const [validationMessage, setValidationMessage] = useState('')

  const modePreset = useMemo(() => {
    const presets = draft?.modePresets || {}
    const selected = presets[mode]
    if (selected) return selected
    return {
      mode,
      tradeOrigin: draft?.tradeOrigin || (mode === 'custom' ? 'custom' : 'system_plan'),
      setupLabel: draft?.setupLabel || 'Signal Setup',
      executionLabel: draft?.executionLabel || 'Actionable',
      entryPrice: draft?.entryPrice,
      stopLoss: draft?.stopLoss,
      target1: draft?.target1,
      target2: draft?.target2,
      planReason: draft?.planReason,
      executionReason: draft?.executionReason,
      riskReward: draft?.riskReward,
    }
  }, [draft, mode])

  const handleModeChange = (nextMode) => {
    const nextPreset =
      draft?.modePresets?.[nextMode] || {
        entryPrice: draft?.entryPrice,
        stopLoss: draft?.stopLoss,
        target1: draft?.target1,
        target2: draft?.target2,
      }

    setMode(nextMode)
    setAllowOverrides(nextMode === 'custom')
    setValidationMessage('')
    setEntryPrice(roundPriceValue(nextPreset?.entryPrice || draft?.currentPrice))
    setStopLoss(roundPriceValue(nextPreset?.stopLoss))
    setTarget1(roundPriceValue(nextPreset?.target1))
    setTarget2(roundPriceValue(nextPreset?.target2))
  }

  const handleOverrideToggle = () => {
    const nextAllowOverrides = !allowOverrides
    setAllowOverrides(nextAllowOverrides)
    setValidationMessage('')

    if (!nextAllowOverrides) {
      setEntryPrice(roundPriceValue(modePreset?.entryPrice || draft?.currentPrice))
      setStopLoss(roundPriceValue(modePreset?.stopLoss))
      setTarget1(roundPriceValue(modePreset?.target1))
      setTarget2(roundPriceValue(modePreset?.target2))
    }
  }

  const sizing = useMemo(() => {
    if (!draft) {
      return { quantity: 0, capitalUsed: 0, riskAmount: 0, riskPerShare: 0 }
    }

    return derivePaperTradeQuantity({
      capital,
      riskPercent,
      entryPrice,
      stopLoss,
    })
  }, [capital, draft, entryPrice, riskPercent, stopLoss])

  if (!draft) return null

  const derivedRiskReward = deriveRiskReward({
    entryPrice,
    stopLoss,
    target1,
  })
  const levelsLocked = mode !== 'custom' && !allowOverrides
  const levelValidation = validateLongTradeLevels({
    entryPrice,
    stopLoss,
    target1,
    target2,
  })
  const effectiveTradeOrigin =
    mode === 'custom'
      ? 'custom'
      : allowOverrides
      ? 'system_override'
      : modePreset?.tradeOrigin || 'system_plan'
  const suggestedRiskReward = draft?.riskReward && draft.riskReward !== '—'
    ? modePreset?.riskReward || draft.riskReward
    : deriveRiskReward({
        entryPrice: modePreset?.entryPrice,
        stopLoss: modePreset?.stopLoss,
        target1: modePreset?.target1,
      })

  const handleConfirm = () => {
    if (!levelValidation.valid) {
      setValidationMessage(levelValidation.reason)
      return
    }
    if (sizing.quantity <= 0) {
      setValidationMessage('Trade size is zero. Adjust capital, risk, or levels.')
      return
    }
    setValidationMessage('')
    onConfirm({
      signal: {
        ...draft,
        mode,
        tradeOrigin: effectiveTradeOrigin,
        setupLabel: modePreset?.setupLabel || draft.setupLabel,
        executionLabel:
          allowOverrides && mode !== 'custom'
            ? 'Manual override'
            : modePreset?.executionLabel || draft.executionLabel,
        entryPrice: Number(entryPrice),
        stopLoss: Number(stopLoss),
        target1: Number(target1),
        target2: Number(target2),
        planReason: modePreset?.planReason || draft.planReason,
        executionReason:
          allowOverrides && mode !== 'custom'
            ? 'System levels were manually overridden inside the paper-trade sandbox.'
            : modePreset?.executionReason || draft.executionReason,
        riskReward: derivedRiskReward,
      },
      capital,
      riskPercent,
      quantity: sizing.quantity,
    })
  }

  return (
    <div className="paper-trade-modal-backdrop" onClick={onClose}>
      <div className="paper-trade-modal" onClick={(event) => event.stopPropagation()}>
        <div className="paper-trade-modal-header">
          <div>
            <div className="paper-trade-eyebrow">Execution Sandbox</div>
            <h3>{draft.symbol} Paper Trade</h3>
            <p>Editable simulator for any scanned stock. Use system levels or override them manually.</p>
          </div>
          <button className="paper-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="paper-trade-modal-body">
        <div className="paper-trade-modal-grid">
          <div className="paper-trade-summary">
            <div className="paper-summary-row"><span>Setup</span><span>{modePreset?.setupLabel || draft.setupLabel}</span></div>
            <div className="paper-summary-row"><span>Trade Origin</span><span>{effectiveTradeOrigin === 'system_plan' ? 'System plan' : effectiveTradeOrigin === 'system_override' ? 'System override' : 'Manual trade'}</span></div>
            <div className="paper-summary-row"><span>Execution</span><span>{modePreset?.executionLabel || draft.executionLabel}</span></div>
            <div className="paper-summary-row"><span>Current Price</span><span>{formatPrice(draft.currentPrice)}</span></div>
            <div className="paper-summary-row"><span>Suggested Entry</span><span>{formatPrice(modePreset?.entryPrice)}</span></div>
            <div className="paper-summary-row"><span>Suggested Stop</span><span>{formatPrice(modePreset?.stopLoss)}</span></div>
            <div className="paper-summary-row"><span>Suggested T1 / T2</span><span>{formatPrice(modePreset?.target1)} / {formatPrice(modePreset?.target2)}</span></div>
            <div className="paper-summary-row"><span>Suggested RR</span><span>1:{suggestedRiskReward}</span></div>
          </div>

          <div className="paper-trade-form">
            <label>
              Trade Type
              <select value={mode} onChange={(e) => handleModeChange(e.target.value)}>
                <option value="custom">Manual</option>
                <option value="intraday">Intraday</option>
                <option value="swing">Swing</option>
              </select>
            </label>

            {mode !== 'custom' && (
              <div className="paper-override-panel">
                <div className="paper-override-copy">
                  <strong>{levelsLocked ? 'System levels locked' : 'System levels overridden'}</strong>
                  <span>
                    {levelsLocked
                      ? 'Intraday and Swing plans use system-defined levels by default.'
                      : 'You are editing system levels manually for this paper trade.'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`paper-override-btn ${allowOverrides ? 'paper-override-btn-active' : ''}`}
                  onClick={handleOverrideToggle}
                >
                  {allowOverrides ? 'Use System Levels' : 'Override Levels'}
                </button>
              </div>
            )}

            <label>
              Entry Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryPrice}
                disabled={levelsLocked}
                onChange={(e) => setEntryPrice(roundPriceValue(e.target.value))}
              />
            </label>

            <label>
              Stop Loss
              <input
                type="number"
                min="0"
                step="0.01"
                value={stopLoss}
                disabled={levelsLocked}
                onChange={(e) => setStopLoss(roundPriceValue(e.target.value))}
              />
            </label>

            <label>
              Target 1
              <input
                type="number"
                min="0"
                step="0.01"
                value={target1}
                disabled={levelsLocked}
                onChange={(e) => setTarget1(roundPriceValue(e.target.value))}
              />
            </label>

            <label>
              Target 2
              <input
                type="number"
                min="0"
                step="0.01"
                value={target2}
                disabled={levelsLocked}
                onChange={(e) => setTarget2(roundPriceValue(e.target.value))}
              />
            </label>

            <label>
              Capital
              <input
                type="number"
                min="1000"
                step="1000"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
              />
            </label>

            <label>
              Risk Per Trade (%)
              <input
                type="number"
                min="0.25"
                max="5"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
              />
            </label>

            <div className="paper-sizing-card">
              <div className="paper-summary-row"><span>Quantity</span><span>{sizing.quantity}</span></div>
              <div className="paper-summary-row"><span>Capital Used</span><span>{formatPrice(sizing.capitalUsed)}</span></div>
              <div className="paper-summary-row"><span>Max Risk</span><span>{formatPrice(sizing.riskAmount)}</span></div>
              <div className="paper-summary-row"><span>Risk / Share</span><span>{formatPrice(sizing.riskPerShare)}</span></div>
              <div className="paper-summary-row"><span>Derived RR</span><span>1:{derivedRiskReward}</span></div>
            </div>

            {validationMessage && (
              <div className="paper-trade-validation">
                {validationMessage}
              </div>
            )}
          </div>
        </div>

        {(modePreset?.planReason || modePreset?.executionReason || draft.planReason || draft.executionReason) && (
          <div className="paper-trade-notes">
            {(modePreset?.planReason || draft.planReason) && <p><strong>Plan:</strong> {modePreset?.planReason || draft.planReason}</p>}
            {(modePreset?.executionReason || draft.executionReason) && <p><strong>Execution:</strong> {modePreset?.executionReason || draft.executionReason}</p>}
          </div>
        )}
        </div>

        <div className="paper-trade-actions">
          <button className="paper-secondary-btn" onClick={onClose}>Cancel</button>
          <button className="paper-primary-btn" onClick={handleConfirm} disabled={sizing.quantity <= 0}>
            Add Paper Trade
          </button>
        </div>
      </div>
    </div>
  )
}
