import { useState, useCallback, useEffect } from "react";
import type { User, LoginMethod } from "../types";
import { authApi, listsApi, pushApi, notificationsApi, type ApiList } from "../../services/api";
import { socketService } from "../../services/socket";
import { getAccessToken, clearTokens, rehydrateTokensFromIdb } from "../../services/api/client";
import { identifyUser, resetAnalyticsUser } from "../services/analytics";

// דגל מודולרי למניעת רישום כפול של פתיחת אפליקציה (שורד StrictMode re-mount)
let _appOpenLogged = false;

// טיפוס נתונים ראשוניים לטעינה מקבילית (פנימי ל-useAuth בלבד)
interface InitialData {
  lists: ApiList[] | null;
  notifications: { notifications: import('../../services/api').PersistedNotification[]; unreadCount: number } | null;
  connectionError?: boolean;
}

export function useAuth() {
  // בדיקת משתמש שמור לרינדור מיידי
  const MAX_CACHE_AGE = 90 * 24 * 60 * 60 * 1000; // 90 יום - תואם ל-refresh token TTL
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      if (cached && getAccessToken()) {
        const parsed = JSON.parse(cached);
        // בדיקת גיל cache, לא משתמשים בנתונים ישנים מ 30 יום
        if (parsed._cachedAt && (Date.now() - parsed._cachedAt) > MAX_CACHE_AGE) {
          localStorage.removeItem('cached_user');
          return null;
        }
        // הסרת _cachedAt מאובייקט המשתמש (rest pattern משמיט את השדה)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _cachedAt, ...userData } = parsed;
        return userData as User;
      }
    } catch { /* ignore */ }
    return null;
  });
  // אם יש משתמש שמור בקאש + טוקן → loading=false מיידית, האפליקציה מוצגת מיד.
  // אימות הטוקן והטענת הנתונים יקרו ברקע (לא חוסם את ה-UI).
  // רק אם אין cache (משתמש חדש או localStorage נמחק) → loading=true עד שהפרופיל נטען.
  const [loading, setLoading] = useState(() => {
    const hasToken = !!getAccessToken();
    if (!hasToken) return false;
    try {
      const cached = localStorage.getItem('cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed._cachedAt && (Date.now() - parsed._cachedAt) <= MAX_CACHE_AGE) {
          return false; // יש cache טרי - מציג מיד
        }
      }
    } catch { /* ignore */ }
    return true; // אין cache טרי - חכה לפרופיל
  });
  // נתונים שנטענו מראש במקביל לפרופיל לטעינה מהירה
  const [initialData, setInitialData] = useState<InitialData>({ lists: null, notifications: null });
  // בדיקת סשן קיים בטעינה
  useEffect(() => {
    const checkAuth = async () => {
      let token = getAccessToken();
      if (!token) {
        // ייתכן ש-localStorage נמחק (iOS Safari ITP); ננסה לשחזר מ-IDB
        const restored = await rehydrateTokensFromIdb();
        if (restored) token = getAccessToken();
      }
      if (!token) {
        // אין טוקן, ניקוי משתמש שמור ועצירת טעינה
        localStorage.removeItem('cached_user');
        setUser(null);
        setLoading(false);
        return;
      }

      // הגבלת זמן, לא להיתקע אם השרת לא מגיב
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
      });

      try {
        // טעינת פרופיל, רשימות והתראות במקביל (timeout 10 שניות)
        const [profile, listsResult, notificationsResult] = await Promise.race([
          Promise.all([
            authApi.getProfile(),
            listsApi.getLists().catch(() => null),
            notificationsApi.getNotifications({ limit: 50 }).catch(() => null),
          ]),
          timeout.then(() => { throw new Error('timeout'); }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ]) as any;

        clearTimeout(timeoutId!);

        // שמירת משתמש לטעינה הבאה
        try { localStorage.setItem('cached_user', JSON.stringify({ ...profile, _cachedAt: Date.now() })); } catch { /* quota exceeded */ }
        // עדכון user רק אם השתנה - מונע re-render מיותר אחרי טעינה מ-cache.
        // המשתמש כבר מוצג מהקאש, אם השרת מחזיר את אותו פרופיל אין סיבה לרנדר שוב.
        setUser(prev => {
          if (prev && prev.id === profile.id && prev.name === profile.name &&
              prev.email === profile.email &&
              prev.avatarColor === profile.avatarColor && prev.avatarEmoji === profile.avatarEmoji) {
            return prev;
          }
          return profile;
        });

        // שמירת נתונים שנטענו מראש לשימוש hooks
        setInitialData({
          lists: listsResult,
          notifications: notificationsResult ? {
            notifications: notificationsResult.notifications,
            unreadCount: notificationsResult.notifications.filter((n: { read: boolean }) => !n.read).length,
          } : null,
        });

        // חיבור socket אחרי אימות מוצלח
        socketService.connect();

        // רישום פתיחת אפליקציה לאדמין (פעם אחת בלבד)
        if (!_appOpenLogged) {
          _appOpenLogged = true;
          authApi.logAppOpen();
        }
      } catch (error) {
        clearTimeout(timeoutId!);
        // התנתקות רק בשגיאות אימות (401, טוקן לא תקף אחרי ניסיון רענון)
        // בשגיאות רשת שומרים את המשתמש השמור למניעת התנתקות מיותרת
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          socketService.disconnect();
          clearTokens();
          localStorage.removeItem('cached_user');
          setUser(null);
        }
        // בשגיאת רשת, המשתמש השמור נשאר (ישן אבל פונקציונלי)
        // סימון שגיאת חיבור כדי להציג הודעה למשתמש
        setInitialData(prev => ({ ...prev, connectionError: true }));
      }
      setLoading(false);
    };
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (userData: User, _loginMethod: LoginMethod = "email") => {
      // שמירת משתמש לטעינה מיידית בביקור הבא
      try { localStorage.setItem('cached_user', JSON.stringify({ ...userData, _cachedAt: Date.now() })); } catch { /* quota exceeded */ }
      setUser(userData);
      identifyUser(userData.id);
      // פעילות כניסה נשמרת בשרת
      // חיבור socket אחרי כניסה
      socketService.connect();
    },
    [],
  );

  const logout = useCallback(async () => {
    resetAnalyticsUser();
    try {
      // ביטול מנוי להתראות push לפני התנתקות
      // מסיר את המנוי גם מהשרת וגם מהדפדפן
      await pushApi.unsubscribeAllPush();
    } catch {
      // ממשיכים בהתנתקות גם אם ביטול ההתראות נכשל
    }
    try {
      await authApi.logout();
    } catch {
      // מתעלמים משגיאות, רק מנקים סטייט מקומי
    }
    socketService.disconnect();
    localStorage.removeItem('cached_user');
    localStorage.removeItem('pushPromptDismissed');
    setInitialData({ lists: null, notifications: null });
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;
      const updatedUser = await authApi.updateProfile(updates);
      try { localStorage.setItem('cached_user', JSON.stringify({ ...updatedUser, _cachedAt: Date.now() })); } catch { /* quota exceeded */ }
      setUser(updatedUser);
    },
    [user],
  );

  return { user, login, logout, updateUser, isAuthenticated: !!user, loading, initialData };
}
