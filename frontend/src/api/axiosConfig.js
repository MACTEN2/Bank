import axios from 'axios';

// Set REACT_APP_API_BASE_URL in the frontend's Vercel project settings to
// the deployed backend's URL (e.g. https://your-backend.vercel.app/api).
// CRA only inlines REACT_APP_* vars at build time, so this must be set
// before each deploy, not read at runtime.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api',
});

// Automatically add JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 here means the token is missing/expired/invalid — bounce to login
// instead of leaving the UI stuck on a raw "Could not validate credentials"
// error with no way forward.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;