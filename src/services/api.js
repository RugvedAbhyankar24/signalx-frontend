import axios from 'axios';

const API_BASE = 'https://signalx-backend.onrender.com/api';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 seconds
  headers: { 'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token if needed
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      const retryAfterSeconds =
        Number(error.response.data?.retryAfterSeconds) ||
        Number(error.response.headers?.['retry-after']) ||
        null;
      const serverMessage = error.response.data?.error;

      if (error.response.status === 429) {
        error.retryAfterSeconds = retryAfterSeconds;
        error.message = retryAfterSeconds
          ? `${serverMessage || 'Too many requests.'} Retry in ${retryAfterSeconds}s.`
          : (serverMessage || 'Too many requests. Please try again later.');
      } else if (serverMessage) {
        error.message = serverMessage;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      error.message = 'No response from server. Please check your connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export default {
  // Stock data endpoints
  getStockData: (symbol, timeframe = '1d') => 
    api.get(`/stocks/${symbol}`, { params: { timeframe } }),
  
  // News endpoints
  getNews: (symbol) => 
    api.get('/news', { params: { symbol } }),

  getNewsWatchlist: ({ force = false } = {}) =>
    api.get('/news/watchlist', { params: force ? { force: 'true' } : {} }),
  
  // Scan endpoints
  scan: (params) => 
    api.post('/scan', params, { timeout: 60000 }), // 60 seconds for scan
  
  // Multiple symbols scan
  scanMultiple: (symbols) => 
    api.post('/scan', { symbols }, { timeout: 60000 }), // 60 seconds for scan

  getTicker: ({ signal } = {}) => api.get('/ticker', { signal }),

  // Market indices (NIFTY / BANK NIFTY / SENSEX)
  getMarketIndices: ({ signal } = {}) => api.get('/market/indices', { signal }),

  // NSE trading holidays for the current year (cached 12h on backend)
  getMarketHolidays: () => api.get('/market/holidays'),

  getStructuredEvents: (symbol) =>
    api.get('/market/events', { params: symbol ? { symbol } : {}, timeout: 20000 }),

  getMarketActivity: ({ symbol, biasDirection } = {}) =>
    api.get('/market/activity', {
      params: {
        ...(symbol ? { symbol } : {}),
        ...(biasDirection ? { biasDirection } : {}),
      },
      timeout: 20000
    }),

  getPaperTradeQuotes: (symbols) =>
    api.post('/market/quotes', { symbols }, { timeout: 15000 }),

  getIntradayLeverage: (symbols) =>
    api.post('/market/leverage', { symbols }, { timeout: 15000 }),

  // Intraday positive stocks
  getIntradayPositiveStocks: (symbols) =>
    api.post('/intraday', { symbols }, { timeout: 240000 }), // 240 seconds — accounts for NSE session retries and deep scans

  // Background scan endpoints
  startIntradayScan: () => 
    api.post('/intraday/start', {}, { timeout: 5000 }), // 5 seconds to start scan

  getIntradayStatus: () => 
    api.get('/intraday/status', { timeout: 5000 }), // 5 seconds to get status

  // Swing trading positive stocks
  getSwingPositiveStocks: (symbols) =>
    api.post('/swing', { symbols }, { timeout: 240000 }), // 240 seconds — accounts for NSE session retries and deep scans

  runSwingBacktest: (params) =>
    api.post('/swing/backtest', params, { timeout: 120000 }),

  runSwingThresholdSweep: (params) =>
    api.post('/swing/backtest/sweep', params, { timeout: 120000 }),

  // Background swing scan endpoints
  startSwingScan: () => 
    api.post('/swing/start', {}, { timeout: 5000 }), // 5 seconds to start scan

  getSwingStatus: () => 
    api.get('/swing/status', { timeout: 5000 }), // 5 seconds to get status

  
  // Add more API calls as needed
};
