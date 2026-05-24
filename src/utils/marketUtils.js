/**
 * marketUtils.js
 * NSE market-hours awareness with live holiday data fetched from the backend.
 *
 * Usage:
 *   import { loadHolidays, isMarketLive } from '../utils/marketUtils'
 *
 *   // Call once on app startup (fire-and-forget is fine)
 *   loadHolidays()
 *
 *   // Then use anywhere — stays sync
 *   if (isMarketLive()) startPolling()
 */

import API from '../services/api'

// ── In-memory holiday store ───────────────────────────────────────────────────
let _holidaySet     = new Set()   // Set<'YYYY-MM-DD'>
let _loadedAt       = 0
const REFRESH_TTL   = 6 * 60 * 60 * 1000  // re-fetch every 6 h

// ── IST helpers ───────────────────────────────────────────────────────────────
function nowIST() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  )
}

function todayIST() {
  const d  = nowIST()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch this year's NSE trading holidays from the backend (which pulls from
 * NSE's official /holiday-master API and caches for 12 h).
 * Safe to call multiple times — skips the network if the local cache is fresh.
 */
export async function loadHolidays() {
  const now = Date.now()
  if (now - _loadedAt < REFRESH_TTL) return   // already fresh

  try {
    const res = await API.getMarketHolidays()
    const dates = res.data?.holidays
    if (Array.isArray(dates)) {
      _holidaySet = new Set(dates)
      _loadedAt   = now
      console.debug('[marketUtils] Loaded', dates.length, 'NSE holidays')
    }
  } catch (err) {
    console.warn('[marketUtils] Holiday fetch failed — weekend guard still active:', err.message)
    // Don't update _loadedAt so the next call retries
  }
}

/**
 * Returns true if today is an NSE trading holiday.
 * Relies on the holiday set populated by loadHolidays().
 */
export function isNSEHoliday() {
  return _holidaySet.has(todayIST())
}

/**
 * Returns true only when the NSE equity market is actively live:
 *   • Not Saturday or Sunday
 *   • Not an NSE holiday (per holiday-master data)
 *   • Time is between 09:15 and 15:30 IST
 *
 * Special case: Budget day (Feb 1) can fall on a Sunday and still trade.
 */
export function isMarketLive() {
  const d   = nowIST()
  const day = d.getDay()
  const min = d.getHours() * 60 + d.getMinutes()

  // Budget session on Feb 1 can be any weekday/Sunday
  if (d.getMonth() === 1 && d.getDate() === 1) {
    return min >= 555 && min <= 930
  }

  if (day === 0 || day === 6) return false   // weekend
  if (isNSEHoliday())         return false   // NSE holiday

  return min >= 555 && min <= 930            // 9:15–15:30 IST
}

/**
 * Returns true if today is a market trading day (regardless of time).
 */
export function isMarketDay() {
  const d   = nowIST()
  const day = d.getDay()
  if (day === 0 || day === 6) return false
  if (isNSEHoliday())         return false
  return true
}
