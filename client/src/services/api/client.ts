import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { socketService } from '../socket/socket.service';
import { debugLog } from './debug-log';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './token-storage';

export { getAccessToken, getRefreshToken, setTokens, clearTokens, rehydrateTokensFromIdb } from './token-storage';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
if (!API_URL) {
  console.error('CRITICAL: VITE_API_URL is not configured for production!');
}

// דגל למניעת הפניה אוטומטית בזמן תהליך אימות פעיל
let isAuthInProgress = false;
export const setAuthInProgress = (value: boolean) => { isAuthInProgress = value; };

// דיווח אבחוני best-effort ל-Sentry (אם מוגדר) ברגע שבו טוקנים מנוקים בפועל
// עקב כשל אימות - לא ידוע מראש אם/למה זה קורה בפרודקשן, אז ברגע שזה כן
// קורה רוצים תיעוד עם ההקשר (סטטוסים שראינו) במקום לנחש שוב על קוד בלבד.
// import דינמי (לא top-level) כי Sentry עצמו נטען lazy ב-main.tsx.
function reportAuthDiagnostic(reason: string, context: Record<string, unknown>) {
  if (!import.meta.env.PROD) return;
  import('@sentry/react').then(Sentry => {
    Sentry.captureMessage(`[auth] ${reason}`, { level: 'warning', extra: context });
  }).catch(() => { /* Sentry לא זמין/לא מוגדר - לא קריטי */ });
}

// timeout ארוך - 60 שניות מתאים גם ל-Render Free cold start (יכול לקחת 30-50ש').
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// ===== רענון טוקן מרכזי =====
// פונקציה אחת משותפת ל HTTP interceptor ול socket service
// מונעת race condition כשגם ה HTTP וגם הsocket מנסים לרענן במקביל
let sharedRefreshPromise: Promise<string | null> | null = null;

// JWT מקודד ב-base64url (RFC 7519) - שונה מ-base64 הרגיל שאותו atob() מצפה
// לו (מחליף +/ ב-/_ ומשמיט padding). בלי ההמרה, atob() זורק חריגה על כל
// טוקן שבו מקרה הבייטים בפועל מייצר '-' או '_' - כלומר רוב הטוקנים בפועל -
// ונתפס ע"י ה-catch כ"פג תוקף" גם כשהוא תקף לגמרי, מה שגרם לרענון מיותר
// (ולפעמים מיותם) בכמעט כל בקשה.
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return atob(padded);
}

/** בדיקה אם הטוקן פג תוקף או עומד לפוג (מרווח 30 שניות) */
export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
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
      // timeout ארוך כמו ב-apiClient (ראו שורה 34) - 10 שניות היה מספיק
      // רק לרוב המקרים, אבל Render Free cold start יכול לקחת 30-50 שניות
      // (ראו הערה למעלה). ניסיון רענון שנקטע ב-timeout כאן מוחזר כ-null
      // בלי לנקות טוקנים (רואים למטה, timeout לא מזוהה כ-401/403/409),
      // אבל זה מבזבז את "הניסיון הראשון" בלי סיכוי אמיתי להצליח כשהשרת
      // עדיין מתעורר - בדיוק ברגע הכי קריטי, פתיחת אפליקציה אחרי שנסגרה.
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      }, { timeout: 20000 });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      setTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      // 401/403: הטוקן לא תקף (או ייתכן שטאב/הקשר אחר כבר סיבב אותו).
      // 409: השרת מבחין מפורשות בין "לא תקף" ל"race מול רענון מקביל שכבר
      // סובב את הטוקן" (ראו auth.controller.ts + token.service.ts,
      // RefreshResult) - חובה לנסות שוב, ואסור לנקות טוקנים על 409 בלבד
      // אפילו אם כל הניסיונות נכשלים, כי זה לא מוכיח שהטוקן לא תקף.
      if (status === 401 || status === 403 || status === 409) {
        // אם המכשיר אופליין - השרת לא זמין, לא מנקים טוקנים
        if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

        // race condition בין טאבים/הקשרים (למשל PWA מותקן + טאב Safari רגיל
        // באותו origin, שניהם עם אותו refresh token): אחד מסובב, השני מקבל
        // 401/409 על הטוקן הישן. המתנה בודדת של 250ms לא מספיקה אם הצד המנצח
        // תקוע מאחורי cold-start של Render (יכול לקחת 30-50 שניות) - ננסה
        // כמה פעמים עם backoff לפני שמסיקים שהטוקן באמת לא תקף ומנקים.
        let lastStatus: number | undefined = status;
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise<void>(r => setTimeout(r, 500 * (attempt + 1)));
          const currentRefreshToken = getRefreshToken();
          if (!currentRefreshToken) break;
          try {
            const retryResponse = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken: currentRefreshToken,
            }, { timeout: 20000 });
            const { accessToken, refreshToken: newRefreshToken } = retryResponse.data.data;
            setTokens(accessToken, newRefreshToken);
            return accessToken;
          } catch (retryError) {
            const retryStatus = (retryError as AxiosError).response?.status;
            lastStatus = retryStatus;
            // שגיאת רשת/שרת (לא 401/403/409) - לא מסיקים כשל אימות, מפסיקים בלי לנקות
            if (retryStatus !== 401 && retryStatus !== 403 && retryStatus !== 409) return null;
            // עדיין נדחה - ייתכן שהצד המנצח עדיין לא סיים, ננסה שוב
          }
        }
        // מנקים רק אם הסטטוס האחרון שראינו הוא כשל אימות אמיתי (401/403).
        // 409 שממשיך לחזור אחרי כל הניסיונות נשאר race לא-פתור - משאירים
        // את המשתמש מחובר, הרענון הבא (בקשת API הבאה) ינסה שוב.
        if (lastStatus === 401 || lastStatus === 403) {
          reportAuthDiagnostic('refresh_exhausted', { initialStatus: status, finalStatus: lastStatus });
          clearTokens();
        }
      }
      // שגיאת שרת (500/502/503) או רשת (ללא תגובה): לא מנקים, ננסה שוב אחר כך
      return null;
    }
  })();

  try {
    return await sharedRefreshPromise;
  } finally {
    sharedRefreshPromise = null;
  }
}

// רענון פרואקטיבי כשהאפליקציה חוזרת מרקע (חזרה מ-sleep של מובייל)
// אם הרענון נכשל סופית (הטוקנים נוקו) - מודיעים למשתמש מיד דרך
// redirectToSessionExpiredLogin, במקום להשאיר סשן מת בשקט עד לבקשת API
// הבאה. ראו ההערה ליד redirectToSessionExpiredLogin למטה לפרטים.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getAccessToken() && isTokenExpired()) {
      refreshAccessToken().then(newToken => {
        if (newToken) {
          socketService.updateToken(newToken);
        } else if (!getRefreshToken()) {
          redirectToSessionExpiredLogin('forced_login_redirect_background', { trigger: 'visibilitychange' });
        }
      });
    }
  });
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

// הפניה מרוכזת ל-login עם דגל "session expired". משמש גם את ה-response
// interceptor למטה (401 אחרי רענון כושל) וגם את הרענון הפרואקטיבי ב-
// visibilitychange למעלה. לפני התיקון, כשל ברענון הפרואקטיבי (שרץ ברקע,
// בלי בקשת API נלווית שהמשתמש מחכה לה) היה מנקה טוקנים בשקט בלי להודיע -
// הסשן כבר היה מת, אבל שום דבר לא הראה את זה. התופעה שהתגלתה: "האפליקציה
// נפתחת ועובדת כמה שניות אחרי סגירה/פתיחה מחדש, ואז לחיצה על כפתור כלשהו
// (הראשון ששולח בקשת API אמיתית) 'מוציאה' עם הודעת פג תוקף" - בעוד שבפועל
// הסשן כבר נכשל קודם, בלי סימן. עכשיו שני המקומות מדווחים על הכשל מיד
// כשהוא מתגלה, לא רק כשהמשתמש נתקל בו במקרה.
function redirectToSessionExpiredLogin(reason: string, extra: Record<string, unknown> = {}) {
  if (isAuthInProgress || isRedirecting || !navigator.onLine || window.location.pathname === '/login') return;
  isRedirecting = true;
  reportAuthDiagnostic(reason, extra);
  localStorage.removeItem('cached_user');
  try { sessionStorage.setItem('session_expired', 'true'); } catch { /* ignore */ }
  window.location.href = '/login';
}

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

    // ===== Retry אוטומטי על תקלות רשת / cold-start =====
    // תקלות רשת (timeout, ECONNABORTED, no response) - מנסים שוב פעם אחת
    // עם backoff. רלוונטי במיוחד ל-Render Free cold start שלוקח 30-50ש'.
    // GET-בלבד כדי לא לכפול פעולות שינוי (POST/PUT/DELETE).
    const reqWithRetry = originalRequest as InternalAxiosRequestConfig & { _retryCount?: number };
    const isNetworkOrTimeout = !error.response && (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ERR_NETWORK' ||
      /timeout|network/i.test(error.message || '')
    );
    const isGetMethod = (originalRequest.method || 'get').toLowerCase() === 'get';
    const retryCount = reqWithRetry._retryCount || 0;
    if (isNetworkOrTimeout && isGetMethod && retryCount < 2) {
      reqWithRetry._retryCount = retryCount + 1;
      // backoff: 1.5s, 3s
      const delay = 1500 * (retryCount + 1);
      debugLog(`Retry ${retryCount + 1}/2 in ${delay}ms for ${originalRequest.url}`, {}, false);
      await new Promise<void>(r => setTimeout(r, delay));
      return apiClient(originalRequest);
    }

    // 401 שלא טופלה כבר (fallback לרענון הפרואקטיבי)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // הגנה מפני race עם בקשות "יתומות": Promise.race עם timeout מקומי
      // (כמו ב-checkAuth, useAuth.ts) לא מבטל בפועל את הבקשה שמפסידה -
      // ה-fetch/axios הבסיסי ממשיך לרוץ ברקע, ויכול להגיע לכאן עם 401
      // אמיתי אחרי שניות ארוכות (Render cold start וכו'), גם אחרי שהצד
      // שקרא לו כבר "ויתר". אם בינתיים כבר קרה login/register/refresh טרי
      // עם טוקן חדש, ה-401 הזה שייך לבקשה ישנה ולא-רלוונטית עוד - מתעלמים
      // במקום לנקות סשן טרי ותקף.
      const requestToken = (originalRequest.headers.Authorization as string | undefined)?.replace('Bearer ', '');
      if (requestToken && requestToken !== getAccessToken()) {
        return Promise.reject(error);
      }

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
      // אם המכשיר אופליין - לא מפנים, המשתמש יחזור לאוויר ויתחדש (מטופל בתוך הפונקציה)
      if (!getRefreshToken()) {
        redirectToSessionExpiredLogin('forced_login_redirect', { url: originalRequest.url, status: error.response?.status });
      }
      // שגיאת רשת: הטוקנים נשמרו, המשתמש יישאר מחובר ויוכל לנסות שוב
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
