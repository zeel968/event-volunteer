import axios from 'axios';

// Detect if we are running locally
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Fallback logic for VITE_API_BASE_URL
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If we are on localhost and the ENV URL is a Railway/Production link, 
  // you might want to use the local one instead during dev.
  if (isLocalhost && (!envUrl || envUrl.includes('railway.app') || envUrl.includes('vercel.app'))) {
    return 'http://localhost:5001/api';
  }
  return envUrl || 'http://localhost:5001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 8000, // Reduced timeout for faster error reporting
});

console.log(`[API] Client initialized with BaseURL: ${api.defaults.baseURL}`);

let tokenProvider = null;

export const setTokenProvider = (provider) => {
  tokenProvider = provider;
};

api.interceptors.request.use(async (config) => {
  try {
    if (tokenProvider) {
      const token = await tokenProvider();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('[API] Auth interceptor failed:', error);
  }
  return config;
}, (error) => Promise.reject(error));

// Global Error Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error('[API] Network Error: The server is unreachable or CORS blocked. URL:', api.defaults.baseURL);
    }
    return Promise.reject(error);
  }
);

export default api;
