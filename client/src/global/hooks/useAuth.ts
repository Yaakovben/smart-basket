import { useState, useCallback, useEffect } from "react";
import type { User, LoginMethod } from "../types";
import { authApi, listsApi, pushApi, notificationsApi, type ApiList } from "../../services/api";
import { socketService } from "../../services/socket";
import { getAccessToken, rehydrateTokensFromIdb, setAuthInProgress } from "../../services/api/client";
import { identifyUser, resetAnalyticsUser } from "../services/analytics";
import { diagLog } from "../helpers/crashLog";

// זמן הרישום האחרון של פתיחת אפליקציה (מודולרי, שורד StrictMode re-mount).
// לא רק "פעם אחת לכל טעינה": מתעדכן גם כשה-PWA/טאב חוזר לחזית אחרי שהיה
// ברקע, כדי ש"כניסה אחרונה" בדשבורד האדמין ישקף שימוש אמיתי ולא ישאר תקוע
// מהפתיחה הראשונה של הסשן.
let _lastAppOpenLogAt = 0;
const APP_OPEN_LOG_THROTTLE_MS = 15 * 60 * 1000; // 15 דקות

const logAppOpenThrottled = () => {
  const now = Date.now();
  if (now - _lastAppOpenLogAt < APP_OPEN_LOG_THROTTLE_MS) return;
  _lastAppOpenLogAt = now;
  authApi.logAppOpen();
};

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
      diagLog('auth', 'checkAuth starting');
      setAuthInProgress(true);
      let token = getAccessToken();
      if (!token) {
        // ייתכן ש-localStorage נמחק (iOS Safari ITP); ננסה לשחזר מ-IDB
        const restored = await rehydrateTokensFromIdb();
        if (restored) token = getAccessToken();
        diagLog('auth', `no token in localStorage, IDB restore=${restored}`);
      }
      if (!token) {
        // אין טוקן, ניקוי משתמש שמור ועצירת טעינה
        diagLog('auth', 'no token at all - user is logged out');
        localStorage.removeItem('cached_user');
        setUser(null);
        setLoading(false);
        return;
      }
      // הטוקן שאיתו checkAuth יוצא לדרך - נשמר כדי לזהות בהמשך (בקאץ') אם
      // בינתיים כבר קרה login/register/googleAuth טרי (ראו הערה בקאץ').
      const tokenAtStart = token;

      // הגבלת זמן, לא להיתקע אם השרת לא מגיב - אבל זו הגבלה על ה-UI (ספינר
      // הטעינה) בלבד. isAuthInProgress, שמגן ב-client.ts מפני redirect
      // מוקדם מדי ל-login, חייב להישאר דלוק עד שבקשת ה-getProfile()
      // האמיתית *באמת* מסתיימת - לא רק עד שה-timeout המלאכותי הזה מוותר
      // (ראו profilePromise.finally למטה). אחרת, בדיוק 10 שניות אחרי
      // הפתיחה המגן כובה מוקדם מדי, ואם הבקשה האמיתית (שממשיכה לרוץ ברקע,
      // כולל רענון טוקן פנימי שיכול לקחת עוד עשרות שניות ב-cold start) מגיעה
      // בסוף ל-401 סופי - ה-response interceptor כבר לא חסום ומפנה
      // ללוגין עם "הסשן פג", גם כשההתחברות טרייה לגמרי והשרת פשוט היה איטי.
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
      });

      const profilePromise = authApi.getProfile();
      profilePromise.finally(() => setAuthInProgress(false));

      try {
        // רשימות/התראות נורות בנפרד מהפרופיל ולא ממתינות זו לזו - כל אחת
        // מעדכנת את initialData ברגע שהיא עצמה מוכנה. לפני התיקון, שלוש
        // הקריאות חיכו יחד ב-Promise.all יחיד: אם רשימות חזרו תוך 200ms
        // אבל התראות לקחו 3 שניות, המשתמש היה רואה מסך ריק 3 שניות למרות
        // שהמידע האמיתי (הרשימות) כבר היה מוכן - "waterfall מוסווה" שגרם
        // לתחושת פתיחה איטית. useLists מגיב ל-initialLists באופן עצמאי
        // (ראה useLists.ts, effect שתלוי רק ב-[initialLists]) אז ברגע
        // שהרשימות מגיעות כאן הן מוצגות מיד, בלי לחכות להתראות.
        const listsPromise = listsApi.getLists().catch(() => null);
        const notificationsPromise = notificationsApi.getNotifications({ limit: 50 }).catch(() => null);

        listsPromise.then(listsResult => {
          if (listsResult) setInitialData(prev => ({ ...prev, lists: listsResult }));
        });
        notificationsPromise.then(notificationsResult => {
          if (notificationsResult) {
            setInitialData(prev => ({
              ...prev,
              notifications: {
                notifications: notificationsResult.notifications,
                unreadCount: notificationsResult.notifications.filter((n: { read: boolean }) => !n.read).length,
              },
            }));
          }
        });

        // הפרופיל הוא היחיד שבאמת קובע את מצב האימות (מחובר/לא) - הוא היחיד
        // שנשאר תחת ה-timeout/race של 10 שניות. רשימות/התראות לא צריכות
        // "לחסום" את הקביעה הזו ולא נכשלות אם הן לוקחות יותר זמן.
        const profile = await Promise.race([
          profilePromise,
          timeout.then(() => { throw new Error('timeout'); }),
        ]);

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

        diagLog('auth', `checkAuth success, user=${profile.id}`);

        // חיבור socket אחרי אימות מוצלח
        socketService.connect();

        // רישום פתיחת אפליקציה לאדמין (throttled)
        logAppOpenThrottled();
      } catch (error) {
        diagLog('auth', `checkAuth failed: ${String(error)}`);
        clearTimeout(timeoutId!);
        // התנתקות רק בשגיאות אימות (401, טוקן לא תקף אחרי ניסיון רענון)
        // בשגיאות רשת שומרים את המשתמש השמור למניעת התנתקות מיותרת
        const status = (error as { response?: { status?: number } })?.response?.status;
        // הגנה קריטית מפני race: checkAuth רץ ברקע (יכול לקחת עד 10 שניות
        // עם הטוקן הישן/שבור שהיה בזמן טעינת האפליקציה - למשל משאריות
        // מבדיקה קודמת). אם המשתמש בינתיים הספיק להתחבר בפועל (login/
        // register/googleAuth) עם טוקן חדש ותקף לגמרי, ה-401 המאוחר הזה
        // שייך לניסיון הישן ולא רלוונטי יותר - בלעדי הבדיקה הזו, ה-catch
        // היה מוחק בשקט את הסשן הטרי-לגמרי כמה שניות אחרי שהמשתמש כבר
        // ראה את מסך הבית, ומחזיר אותו ללוגין בלי שום סיבה אמיתית.
        const tokenStillCurrent = getAccessToken() === tokenAtStart;
        diagLog('auth', `checkAuth error status=${status} tokenStillCurrent=${tokenStillCurrent}`);
        // לא מנתקים אוטומטית אף פעם, גם על 401 מאומת - רק מדווחים. אחרי
        // סבב ארוך של תיקוני race condition (reload-ים לא-מבוקרים,
        // בקשות יתומות וכו') שכל אחד מהם עדיין הצליח להוציא משתמשים
        // מחוברים בטעות, ההחלטה המפורשת: היחיד שמוציא משתמש הוא logout
        // מפורש. אם הטוקן באמת לא תקף, בקשות ה-API הבאות ימשיכו לנסות
        // לרענן/להיכשל בלי לאפס את הסשן בשקט.
        if (status === 401 && tokenStillCurrent) {
          diagLog('auth', 'confirmed 401 on launch - NOT clearing session (see comment)');
          if (import.meta.env.PROD) {
            import('@sentry/react').then(Sentry => {
              Sentry.captureMessage('[auth] checkAuth_401_on_launch_suppressed', { level: 'warning' });
            }).catch(() => { /* Sentry לא זמין/לא מוגדר - לא קריטי */ });
          }
        }
        // בשגיאת רשת, המשתמש השמור נשאר (ישן אבל פונקציונלי)
        // סימון שגיאת חיבור כדי להציג הודעה למשתמש
        setInitialData(prev => ({ ...prev, connectionError: true }));
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // רישום פתיחת אפליקציה גם כש-PWA/טאב חוזר לחזית מהרקע (לא רק ב-mount הראשוני).
  // מובייל/PWA לרוב לא עושים reload מלא כשחוזרים מהרקע, אז בלי זה "כניסה אחרונה"
  // נשארת תקועה מהפתיחה הראשונה של הסשן.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && getAccessToken()) {
        logAppOpenThrottled();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  // הוספה/הסרה של "מוצר קבוע" - אופטימיסטי (עדכון מיידי, שחזור אם השרת נכשל)
  const toggleStaple = useCallback(
    async (name: string) => {
      if (!user) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const previousStaples = user.staples || [];
      const exists = previousStaples.includes(trimmed);
      const optimisticStaples = exists
        ? previousStaples.filter(s => s !== trimmed)
        : [...previousStaples, trimmed];

      setUser(prev => prev ? { ...prev, staples: optimisticStaples } : prev);
      try {
        const { staples } = await authApi.toggleStaple(trimmed);
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev, staples };
          try { localStorage.setItem('cached_user', JSON.stringify({ ...updated, _cachedAt: Date.now() })); } catch { /* quota exceeded */ }
          return updated;
        });
      } catch {
        setUser(prev => prev ? { ...prev, staples: previousStaples } : prev);
        throw new Error('toggleStaple failed');
      }
    },
    [user],
  );

  return { user, login, logout, updateUser, toggleStaple, isAuthenticated: !!user, loading, initialData };
}
