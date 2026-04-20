import axios from 'axios';
import axiosRetry from 'axios-retry';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Configure auto-retry logic
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  // Only retry on network errors or idempotent 5xx errors (response is undefined or >= 500)
  retryCondition: (error) => {
    return !error.response || (error.response.status >= 500);
  }
});

// Interceptor to add Clerk token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('clerk-db-session'); // We'll manage this in EventContext
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
