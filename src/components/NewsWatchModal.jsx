import { useCallback, useEffect, useRef, useState } from 'react'
import API from '../services/api'
import './NewsWatchModal.css'

/* ─────────────────────────────────────────────
   FORMATTERS
───────────────────────────────────────────── */
function formatTimeAgo(datetime) {
  if (!datetime) return 'Just now'
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(datetime))
  if (seconds < 3600)  return `${Math.max(1, Math.floor(seconds / 60))}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return null
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function formatPct(value) {
  if (!Number.isFinite(value)) return null
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(2)}%`
}

function formatCountdown(ms) {
  if (ms <= 0) return 'now'
  const totalSeconds = Math.ceil(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

/* ─────────────────────────────────────────────
   SENTIMENT ICON
───────────────────────────────────────────── */
const SENTIMENT_ICONS = { positive: '↑', negative: '↓', neutral: '→' }

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function NewsWatchModal({ onClose }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)      // true only on very first fetch
  const [refreshing, setRefreshing] = useState(false) // true on manual/background refresh
  const [stale, setStale]       = useState(false)
  const [error, setError]       = useState('')
  const [nextRefreshMs, setNextRefreshMs] = useState(null)
  const [countdown, setCountdown] = useState(null)

  const refreshTimer   = useRef(null)
  const countdownTimer = useRef(null)
  const nextRefreshAt  = useRef(null)
  const isMounted      = useRef(true)
  const hasLoadedOnce  = useRef(false)
  const dialogRef      = useRef(null)

  /* ── fetch ──────────────────────────────── */
  const load = useCallback(async ({ manual = false } = {}) => {
    if (!isMounted.current) return

    if (!hasLoadedOnce.current) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    if (manual) setError('')

    let refreshAfterMs = 15 * 60 * 1000

    try {
      // Manual refresh busts the server-side cache so the user always gets
      // a fresh rebuild — not the same cached payload served back again.
      const response = await API.getNewsWatchlist({ force: manual })
      const payload = response.data
      if (!isMounted.current) return
      setData(payload)
      setStale(payload?.stale === true)
      setError('')
      refreshAfterMs = payload?.marketState?.refreshMs || refreshAfterMs
    } catch (err) {
      if (!isMounted.current) return
      console.error('[NewsWatchModal] fetch error:', err)
      setError(err.message || 'Failed to load daily watchlist')
      // Keep existing data visible on refresh errors
    } finally {
      if (!isMounted.current) return
      hasLoadedOnce.current = true
      setLoading(false)
      setRefreshing(false)

      // Schedule next auto-refresh
      if (refreshTimer.current)   clearTimeout(refreshTimer.current)
      if (countdownTimer.current) clearInterval(countdownTimer.current)

      nextRefreshAt.current = Date.now() + refreshAfterMs
      setNextRefreshMs(refreshAfterMs)

      // Countdown ticker (updates every second)
      countdownTimer.current = setInterval(() => {
        if (!isMounted.current) return
        const remaining = nextRefreshAt.current - Date.now()
        setCountdown(Math.max(0, remaining))
        if (remaining <= 0) clearInterval(countdownTimer.current)
      }, 1000)

      refreshTimer.current = setTimeout(() => {
        if (isMounted.current) load()
      }, refreshAfterMs)
    }
  }, [])

  /* ── mount / unmount ────────────────────── */
  useEffect(() => {
    isMounted.current = true
    load()
    return () => {
      isMounted.current = false
      if (refreshTimer.current)   clearTimeout(refreshTimer.current)
      if (countdownTimer.current) clearInterval(countdownTimer.current)
    }
  }, [load])

  /* ── Escape key + focus trap ────────────── */
  useEffect(() => {
    const prevFocus = document.activeElement
    // Move focus into dialog
    dialogRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables.length) { e.preventDefault(); return }
        const first = focusables[0]
        const last  = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      prevFocus?.focus?.()
    }
  }, [onClose])

  /* ── derived values ─────────────────────── */
  const items        = data?.items || []
  const sessionLabel = data?.marketState?.label || 'Daily news watch'
  const updatedAt    = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
      })
    : null

  const countdownLabel = countdown != null && !refreshing
    ? `Auto-refreshes in ${formatCountdown(countdown)}`
    : refreshing
    ? 'Fetching fresh news…'
    : null

  /* ── render helpers ─────────────────────── */
  const renderPriceRow = (item) => {
    const price  = formatPrice(item.currentPrice)
    const change = formatPct(item.dayChangePct)
    if (!price && !change) return null
    const changeClass = Number.isFinite(item.dayChangePct)
      ? (item.dayChangePct >= 0 ? 'positive' : 'negative')
      : ''
    return (
      <div className="news-watch-metrics">
        {price  && <span className="nwm-price">{price}</span>}
        {change && <span className={`nwm-change ${changeClass}`}>{change}</span>}
        <span className="nwm-age">{formatTimeAgo(item.datetime)}</span>
      </div>
    )
  }

  return (
    <div
      className="news-watch-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="news-watch-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Daily News Radar"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="news-watch-modal-header">
          <div className="nwm-header-left">
            <div className="news-watch-modal-eyebrow">Daily News Radar</div>
            <h3>Top 5 Stocks to Watch</h3>
            <p className="nwm-subline">
              {sessionLabel}
              {updatedAt ? ` · Updated ${updatedAt} IST` : ''}
              {stale && <span className="nwm-stale-badge"> · Refreshing…</span>}
            </p>
            {countdownLabel && (
              <p className="nwm-countdown">{countdownLabel}</p>
            )}
          </div>

          <div className="nwm-header-actions">
            <button
              className="nwm-refresh-btn"
              onClick={() => load({ manual: true })}
              disabled={loading || refreshing}
              aria-label="Refresh watchlist"
              title="Refresh watchlist"
            >
              <span className={refreshing ? 'nwm-spin' : ''}>↻</span>
            </button>
            <button
              className="news-watch-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="news-watch-modal-body">
          {/* Refreshing overlay strip */}
          {refreshing && (
            <div className="nwm-refresh-bar" role="status" aria-label="Refreshing…" />
          )}

          {loading && !data ? (
            <div className="news-watch-state">
              <span className="nwm-spin nwm-spin-lg">↻</span>
              <span>Building the latest watchlist…</span>
            </div>
          ) : error && !data ? (
            <div className="news-watch-state news-watch-error">
              <p>{error}</p>
              <button
                className="nwm-retry-btn"
                onClick={() => load({ manual: true })}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="news-watch-state">
              No strong news-driven setups found right now.
            </div>
          ) : (
            <>
              {error && (
                <div className="nwm-inline-error" role="alert">
                  {error} — showing previous results
                </div>
              )}
              <div className="news-watch-list">
                {items.map((item) => (
                  <article key={item.symbol} className="news-watch-card">
                    <div className="news-watch-card-top">
                      <div>
                        <div className="news-watch-rank">#{item.rank}</div>
                        <h4>{item.symbol}</h4>
                        <div className="news-watch-company">{item.companyName}</div>
                      </div>
                      <div className="nwm-badges">
                        <span className={`news-watch-sentiment sentiment-${item.sentiment}`}>
                          {SENTIMENT_ICONS[item.sentiment] || ''} {item.sentiment}
                        </span>
                        {item.newsCount > 1 && (
                          <span className="nwm-news-count" title={`${item.newsCount} articles`}>
                            {item.newsCount} articles
                          </span>
                        )}
                      </div>
                    </div>

                    {renderPriceRow(item)}

                    <a
                      className="news-watch-headline"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.headline}
                    </a>

                    {item.summary && (
                      <p className="news-watch-summary">{item.summary}</p>
                    )}

                    <div className="news-watch-footer">
                      <span className="nwm-source">{item.source || 'News source'}</span>
                      <span className="nwm-reason">{item.reason}</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="news-watch-modal-footer">
          <p className="nwm-disclaimer">
            News-driven, not financial advice. Always do your own research.
          </p>
          <button className="analytics-secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
