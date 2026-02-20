import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { socketService } from '../socket/socket.service';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
if (!API_URL) {
  console.error('CRITICAL: VITE_API_URL is not configured for production!');
}

// לוג דיבאג, רק במצב פיתוח
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

// דגל למניעת הפניה אוטומטית בזמן תהליך אימות פעיל
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
    // localStorage מלא או לא זמין, למשל גלישה פרטית
    debugLog('Failed to save tokens to localStorage', undefined, true);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ===== רענון טוקן מרכזי =====
// פונקציה אחת משותפת ל HTTP interceptor ול socket service
// מונעת race condition כשגם ה HTTP וגם הsocket מנסים לרענן במקביל
let sharedRefreshPromise: Promise<string | null> | null = null;

/** בדיקה אם הטוקן פג תוקף או עומד לפוג (מרווח 30 שניות) */
export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    // מרווח ביטחון של 30 שניות לפני תפוגה בפועל
    return !payload.exp || payload.exp * 1000 < Date.now() + 30000;
  } catch {
    return true;
  }
}

/**
 * רענון טוקן משותף עם deduplication
 * אם כמה קריאות מנסות לרענן במקביל, רק בקשה אחת יוצאת לשרת
 * מחזיר access token חדש או null אם נכשל
 */
export async function refreshAccessToken(): Promise<string | null> {
  // אם כבר מתבצע רענון, ממתינים לאותו promise
  if (sharedRefreshPromise) return sharedRefreshPromise;

  sharedRefreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      // שימוש ב axios ישיר (לא apiClient) למניעת interceptor רקורסיבי
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      }, { timeout: 10000 });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      setTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      // שגיאת אימות מהשרת: refresh token לא תקף, מנקים טוקנים
      if (axiosError.response) {
        clearTokens();
      }
      // שגיאת רשת (ללא תגובה): לא מנקים, ננסה שוב אחר כך
      return null;
    }
  })();

  try {
    return await sharedRefreshPromise;
  } finally {
    sharedRefreshPromise = null;
  }
}

// ===== Request Interceptor =====
// רענון פרואקטיבי: אם הטוקן פג, מרענן לפני שליחת הבקשה
// מונע 401 מיותרים ושיפור חוויית משתמש
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = getAccessToken();

    // רענון פרואקטיבי אם הטוקן פג תוקף או עומד לפוג
    if (token && isTokenExpired()) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        token = newToken;
        // עדכון socket עם הטוקן החדש
        socketService.updateToken(newToken);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // מניעת cache, בעיקר iOS Safari
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

// ===== Response Interceptor =====
// טיפול ב 401 כ fallback: אם הרענון הפרואקטיבי לא עזר
let isRedirecting = false;

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

    // 401 שלא טופלה כבר (fallback לרענון הפרואקטיבי)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // רענון משותף עם dedup, מונע race condition עם socket
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // עדכון socket עם הטוקן החדש
        socketService.updateToken(newAccessToken);
        // ניסיון חוזר של הבקשה המקורית
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }

      // הרענון נכשל
      // בדיקה אם הטוקנים נוקו (שגיאת אימות) או לא (שגיאת רשת)
      if (!getRefreshToken()) {
        // שגיאת אימות אמיתית, טוקנים נוקו, מפנים ללוגין
        if (!isAuthInProgress && !isRedirecting && window.location.pathname !== '/login') {
          isRedirecting = true;
          localStorage.removeItem('cached_user');
          try { sessionStorage.setItem('session_expired', 'true'); } catch { /* ignore */ }
          window.location.href = '/login';
        }
      }
      // שגיאת רשת: הטוקנים נשמרו, המשתמש יישאר מחובר ויוכל לנסות שוב
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
