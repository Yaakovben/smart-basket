import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Debug mode - shows alerts on mobile for debugging (only errors)
const DEBUG_MODE = false;
const debugLog = (message: string, data?: unknown, isError = false) => {
  console.log(`[API DEBUG] ${message}`, data);
  // Only show alert for errors to avoid spam
  if (DEBUG_MODE && isError && typeof window !== 'undefined') {
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    alert(`[DEBUG ERROR] ${message}${dataStr}`);
  }
};

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Flag to prevent auto-redirect during active auth process
let isAuthInProgress = false;
export const setAuthInProgress = (value: boolean) => { isAuthInProgress = value; };

// Create axios instance with timeout for mobile networks
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for slow mobile networks
});

// Token helpers
export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Request interceptor - add auth token, cache busting headers, and debug
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Force fresh request headers (cache busting for iOS Safari)
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['X-Request-Time'] = Date.now().toString();

    debugLog(`Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      method: config.method,
      url: `${config.baseURL}${config.url}`,
    }, false);
    return config;
  },
  (error) => {
    debugLog('Request Error', error, true);
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    debugLog(`Response OK: ${response.status}`, { url: response.config.url }, false);
    return response;
  },
  async (error: AxiosError) => {
    debugLog(`Response ERROR: ${error.response?.status || 'NO STATUS'}`, {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: `${error.config?.baseURL}${error.config?.url}`,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    }, true);
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request
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

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // Don't redirect if we're in the middle of authentication
        if (!isAuthInProgress) {
          clearTokens();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setTokens(accessToken, newRefreshToken);

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Don't redirect if we're in the middle of authentication
        if (!isAuthInProgress) {
          clearTokens();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
