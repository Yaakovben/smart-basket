import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { socketService } from '../socket/socket.service';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
if (!API_URL) {
  console.error('CRITICAL: VITE_API_URL is not configured for production!');
}

// לוג דיבאג - רק במצב פיתוח
const debugLog = (message: string, data?: unknown, isError = false) => {
  if (import.meta.env.DEV) {
    if (isError) {
      console.error(`[API] ${message}`, data);
    } else {
      console.log(`[API] ${message}`, data);
    }
  }
};

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// דגל למניעת redirect אוטומטי בזמן תהליך אימות פעיל
let isAuthInProgress = false;
export const setAuthInProgress = (value: boolean) => { isAuthInProgress = value; };

// timeout ארוך לרשתות מובייל איטיות
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken: string, refreshToken: string) => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // localStorage מלא או לא זמין (למשל private browsing)
    debugLog('Failed to save tokens to localStorage', undefined, true);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Interceptor: הוספת טוקן אימות ו-cache busting
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // מניעת cache (בעיקר בשביל iOS Safari)
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

// Interceptor: רענון טוקן אוטומטי ב-401
let isRefreshing = false;
let isRedirecting = false;
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // הוספה לתור בקשות שממתינות לרענון
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
        isRefreshing = false;
        // לא לנווט אם בתהליך אימות, כבר בדף login, או כבר במהלך ניווט
        if (!isAuthInProgress && !isRedirecting && window.location.pathname !== '/login') {
          isRedirecting = true;
          clearTokens();
          localStorage.removeItem('cached_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        }, { timeout: 10000 });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        setTokens(accessToken, newRefreshToken);

        // סנכרון הטוקן החדש עם חיבור ה-Socket
        socketService.updateToken(accessToken);

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (!isAuthInProgress && !isRedirecting && window.location.pathname !== '/login') {
          isRedirecting = true;
          clearTokens();
          localStorage.removeItem('cached_user');
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
