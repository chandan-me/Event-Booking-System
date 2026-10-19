import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// In-memory token storage to avoid token exposure in localStorage (XSS prevention)
let inMemoryAccessToken = sessionStorage.getItem('eventpass_access_token') || null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
  if (token) {
    sessionStorage.setItem('eventpass_access_token', token);
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    sessionStorage.removeItem('eventpass_access_token');
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export const getAccessToken = () => inMemoryAccessToken;

export const clearAuthTokens = () => {
  inMemoryAccessToken = null;
  sessionStorage.removeItem('eventpass_access_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  delete apiClient.defaults.headers.common.Authorization;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds to support payment gateway checkout & ticket generation
  withCredentials: true, // Send and receive HttpOnly cookies for secure session management
});

// Request Interceptor: Injects Bearer token and unique X-Request-ID
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const requestId = `web-${Math.random().toString(36).substring(2, 10)}`;
    config.headers['X-Request-ID'] = requestId;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles 401 Token Expiration with Automatic Refresh Rotation via HttpOnly Cookie
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/v1/auth/login') &&
      !originalRequest.url?.includes('/api/v1/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent session refresh via HttpOnly refresh cookie
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse.data?.data?.access_token;
        if (newToken) {
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response missing access token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthTokens();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
