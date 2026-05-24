import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { loadHolidays } from './utils/marketUtils'

// Load NSE holidays before rendering so isMarketLive() has the full holiday
// set from the very first render. Cap the wait at 3 s so a slow/offline
// backend never blocks the app from starting.
const holidayTimeout = new Promise(resolve => setTimeout(resolve, 3000))

Promise.race([loadHolidays(), holidayTimeout]).finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
