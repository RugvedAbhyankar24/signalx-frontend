const STORAGE_KEY = 'signalx-paper-trades-v1'
const IST_TIMEZONE = 'Asia/Kolkata'
const INTRADAY_AUTO_SQUARE_OFF_MINUTES = 15 * 60 + 20

const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const getISTDateParts = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const pick = (type) => parts.find((part) => part.type === type)?.value || ''
  const year = pick('year')
  const month = pick('month')
  const day = pick('day')
  const hour = Number(pick('hour'))
  const minute = Number(pick('minute'))

  return {
    dateKey: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  }
}

export const validateLongTradeLevels = ({ entryPrice, stopLoss, target1, target2 }) => {
  const entry = Math.max(toNumber(entryPrice), 0)
  const stop = Math.max(toNumber(stopLoss), 0)
  const t1 = Math.max(toNumber(target1), 0)
  const t2 = Math.max(toNumber(target2), 0)

  if (!entry || !stop || !t1 || !t2) {
    return { valid: false, reason: 'All trade levels must be greater than zero.' }
  }

  if (stop >= entry) {
    return { valid: false, reason: 'For long trades, stop loss must be below entry price.' }
  }

  if (t1 < entry) {
    return { valid: false, reason: 'For long trades, Target 1 must be at or above entry price.' }
  }

  if (t2 < t1) {
    return { valid: false, reason: 'Target 2 must be greater than or equal to Target 1.' }
  }

  return { valid: true, reason: '' }
}

export const loadPaperTrades = () => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to load paper trades', error)
    return []
  }
}

export const savePaperTrades = (trades) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
}

export const derivePaperTradeQuantity = ({
  capital,
  riskPercent,
  entryPrice,
  stopLoss,
  mode,
  leverageMultiplier,
}) => {
  const capitalValue = Math.max(toNumber(capital), 0)
  const riskValue = Math.max(toNumber(riskPercent), 0)
  const entry = Math.max(toNumber(entryPrice), 0)
  const stop = Math.max(toNumber(stopLoss), 0)
  const normalizedLeverage = mode === 'intraday'
    ? Math.max(toNumber(leverageMultiplier, 1), 1)
    : 1

  if (!capitalValue || !entry) {
    return {
      quantity: 0,
      riskPerShare: 0,
      capitalUsed: 0,
      grossExposure: 0,
      riskAmount: 0,
      leverageMultiplier: normalizedLeverage,
    }
  }

  if (stop >= entry) {
    return {
      quantity: 0,
      riskPerShare: 0,
      capitalUsed: 0,
      grossExposure: 0,
      riskAmount: 0,
      leverageMultiplier: normalizedLeverage,
    }
  }

  const riskPerShare = Math.max(entry - stop, 0.01)
  const effectiveBuyingPower = capitalValue * normalizedLeverage
  const capitalCappedQty = Math.floor(effectiveBuyingPower / entry)
  const riskBudgetBase = mode === 'intraday' ? effectiveBuyingPower : capitalValue
  const riskBudget = riskBudgetBase * (riskValue / 100)
  const riskCappedQty = riskValue > 0 ? Math.floor(riskBudget / riskPerShare) : capitalCappedQty
  const quantity = Math.max(Math.min(capitalCappedQty, riskCappedQty), 0)
  const grossExposure = quantity * entry

  return {
    quantity,
    riskPerShare,
    capitalUsed: normalizedLeverage > 1 ? grossExposure / normalizedLeverage : grossExposure,
    grossExposure,
    leveragedCapital: effectiveBuyingPower,
    riskAmount: quantity * riskPerShare,
    leverageMultiplier: normalizedLeverage,
  }
}

export const deriveRiskReward = ({ entryPrice, stopLoss, target1 }) => {
  const entry = Math.max(toNumber(entryPrice), 0)
  const stop = Math.max(toNumber(stopLoss), 0)
  const target = Math.max(toNumber(target1), 0)

  if (!entry || !target || entry === stop) return '—'
  if (stop >= entry || target < entry) return '—'

  const reward = target - entry
  const risk = entry - stop
  if (!risk) return '—'

  return (reward / risk).toFixed(2)
}

const getTradeDirection = (trade) => trade.direction || 'long'

export const evaluatePaperTrade = (trade, priceOverride) => {
  const entry = toNumber(trade.entryPrice)
  const stop = toNumber(trade.stopLoss)
  const t1 = toNumber(trade.target1)
  const t2 = toNumber(trade.target2)
  const quantity = toNumber(trade.quantity)
  const currentPrice = toNumber(priceOverride ?? trade.lastKnownPrice, entry)
  const direction = getTradeDirection(trade)
  const sign = direction === 'short' ? -1 : 1
  const levelsValid = validateLongTradeLevels({
    entryPrice: entry,
    stopLoss: stop,
    target1: t1,
    target2: t2,
  }).valid
  const unrealizedPnl = (currentPrice - entry) * quantity * sign
  const unrealizedPct = entry ? ((currentPrice - entry) / entry) * 100 * sign : 0

  let status = trade.status || 'open'
  let statusLabel = trade.statusLabel || 'Open'
  let realizedPnl = trade.realizedPnl ?? null
  let closedAt = trade.closedAt || null
  let closeReason = trade.closeReason || null

  if (!String(status).startsWith('closed') && levelsValid) {
    if ((direction === 'long' && currentPrice <= stop) || (direction === 'short' && currentPrice >= stop)) {
      status = 'closed_stop_loss'
      statusLabel = 'Stopped Out'
      realizedPnl = (stop - entry) * quantity * sign
      closedAt = trade.closedAt || new Date().toISOString()
      closeReason = 'stop_loss'
    } else if ((direction === 'long' && currentPrice >= t2) || (direction === 'short' && currentPrice <= t2)) {
      status = 'closed_target2'
      statusLabel = 'Target 2 Hit'
      realizedPnl = (t2 - entry) * quantity * sign
      closedAt = trade.closedAt || new Date().toISOString()
      closeReason = 'target2'
    } else if ((direction === 'long' && currentPrice >= t1) || (direction === 'short' && currentPrice <= t1)) {
      status = 'target1_hit'
      statusLabel = 'Target 1 Hit'
      closeReason = 'target1'
    } else {
      status = 'open'
      statusLabel = 'Open'
      closeReason = null
    }
  }

  return {
    ...trade,
    status,
    statusLabel,
    lastKnownPrice: currentPrice,
    unrealizedPnl,
    unrealizedPct,
    realizedPnl,
    closedAt,
    closeReason,
    lastUpdated: new Date().toISOString(),
  }
}

export const createPaperTrade = ({ signal, capital, riskPercent, quantity }) => {
  const entry = toNumber(signal.entryPrice)
  const stop = toNumber(signal.stopLoss)
  const t1 = toNumber(signal.target1)
  const t2 = toNumber(signal.target2)
  const derived = derivePaperTradeQuantity({
    capital,
    riskPercent,
    entryPrice: entry,
    stopLoss: stop,
    mode: signal.mode,
    leverageMultiplier: signal.leverageMultiplier,
  })
  const finalQuantity = Math.max(toNumber(quantity), 0) || derived.quantity
  const createdAt = new Date().toISOString()
  const leverageMultiplier = Math.max(toNumber(signal.leverageMultiplier, signal.mode === 'intraday' ? 1 : 1), 1)
  const grossExposure = finalQuantity * entry
  const capitalUsed = leverageMultiplier > 1 ? grossExposure / leverageMultiplier : grossExposure

  const trade = {
    id: `${signal.symbol}-${signal.mode}-${Date.now()}`,
    symbol: signal.symbol,
    companyName: signal.companyName || signal.symbol,
    mode: signal.mode,
    tradeOrigin: signal.tradeOrigin || (signal.mode === 'custom' ? 'custom' : 'system_plan'),
    setupLabel: signal.setupLabel || 'Signal Setup',
    executionLabel: signal.executionLabel || 'Actionable',
    entryPrice: entry,
    stopLoss: stop,
    target1: t1,
    target2: t2,
    currentPrice: toNumber(signal.currentPrice, entry),
    lastKnownPrice: toNumber(signal.currentPrice, entry),
    quantity: finalQuantity,
    capital: toNumber(capital),
    riskPercent: toNumber(riskPercent),
    leverageMultiplier,
    capitalUsed,
    grossExposure,
    plannedRiskAmount: finalQuantity * Math.max(entry - stop, 0.01),
    planReason: signal.planReason || '',
    executionReason: signal.executionReason || '',
    riskReward: signal.riskReward || deriveRiskReward({
      entryPrice: entry,
      stopLoss: stop,
      target1: t1,
    }),
    direction: 'long',
    status: 'open',
    statusLabel: 'Open',
    closeReason: null,
    realizedPnl: null,
    unrealizedPnl: 0,
    unrealizedPct: 0,
    createdAt,
    lastUpdated: createdAt,
    source: signal.source || 'SignalX',
  }

  return evaluatePaperTrade(trade, trade.lastKnownPrice)
}

export const updateTradesWithQuotes = (trades, quotesMap) =>
  trades.map((trade) => {
    if (String(trade.status).startsWith('closed')) return trade
    const quote = quotesMap[trade.symbol]
    return quote == null ? trade : evaluatePaperTrade(trade, quote)
  })

export const manuallyCloseTrade = (trade, closePrice) => {
  const finalPrice = toNumber(closePrice ?? trade.lastKnownPrice, trade.entryPrice)
  const entry = toNumber(trade.entryPrice)
  const quantity = toNumber(trade.quantity)
  const sign = getTradeDirection(trade) === 'short' ? -1 : 1

  return {
    ...trade,
    status: 'closed_manual',
    statusLabel: 'Closed Manually',
    closeReason: 'manual_close',
    lastKnownPrice: finalPrice,
    realizedPnl: (finalPrice - entry) * quantity * sign,
    unrealizedPnl: 0,
    unrealizedPct: 0,
    closedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  }
}

export const autoSquareOffIntradayTrades = (trades, now = new Date()) => {
  const { dateKey: currentDateKey, minutes: currentMinutes } = getISTDateParts(now)

  return trades.map((trade) => {
    if (String(trade.status).startsWith('closed')) return trade
    if (trade.mode !== 'intraday') return trade

    const { dateKey: tradeDateKey } = getISTDateParts(trade.createdAt || trade.lastUpdated || now)
    const shouldSquareOff =
      tradeDateKey < currentDateKey ||
      (tradeDateKey === currentDateKey && currentMinutes >= INTRADAY_AUTO_SQUARE_OFF_MINUTES)

    if (!shouldSquareOff) return trade

    const finalPrice = toNumber(trade.lastKnownPrice, trade.entryPrice)
    const entry = toNumber(trade.entryPrice)
    const quantity = toNumber(trade.quantity)
    const sign = getTradeDirection(trade) === 'short' ? -1 : 1

    return {
      ...trade,
      status: 'closed_auto_squareoff',
      statusLabel: 'Auto Squared Off',
      closeReason: 'intraday_auto_squareoff',
      lastKnownPrice: finalPrice,
      realizedPnl: (finalPrice - entry) * quantity * sign,
      unrealizedPnl: 0,
      unrealizedPct: 0,
      closedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }
  })
}
