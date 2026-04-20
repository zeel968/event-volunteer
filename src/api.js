import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// A placeholder for the token provider (will be set by EventContext)
let tokenProvider = null;

export const setTokenProvider = (provider) => {
  tokenProvider = provider;
};

/**
 * Native Clerk Token Interceptor
 * Uses the registered token provider to fetch a fresh session token for every request.
 */
api.interceptors.request.use(async (config) => {
  try {
    if (tokenProvider) {
      const token = await tokenProvider();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      // Fallback for cases before provider is registered (SSR or early loads)
      const token = await window.Clerk?.session?.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error('[API] Failed to get Clerk token:', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
