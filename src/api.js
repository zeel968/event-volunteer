import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

/**
 * Native Clerk Token Interceptor
 * Automatically attaches the Clerk session token to every outgoing request.
 */
api.interceptors.request.use(async (config) => {
  try {
    // We assume Clerk is available globally via window.Clerk or passed through headers
    // But since we are inside a context usually, we'll let the context set the header or 
    // better: use a dynamic approach.
    const token = await window.Clerk?.session?.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('[API] Failed to get Clerk token:', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
