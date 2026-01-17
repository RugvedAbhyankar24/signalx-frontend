import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
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
  
  // Scan endpoints
  scan: (params) => 
    api.post('/scan', params),
  
  // Multiple symbols scan
  scanMultiple: (symbols) => 
    api.post('/scan', { symbols }),

getTicker: () => api.get('/ticker'),

// Market indices (NIFTY / BANK NIFTY / SENSEX)
getMarketIndices: () =>
  api.get('/market/indices'),

  
  // Add more API calls as needed
};
