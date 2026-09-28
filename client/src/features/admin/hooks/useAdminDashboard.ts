import { useState, useMemo, useCallback, useEffect } from "react";
import type { LoginActivity } from "../../../global/types";
import type { UseAdminDashboardReturn, DashboardStats, UserWithLastLogin } from "../types";
import { adminApi, type AdminUser, type AdminLoginActivity, type AdminStats } from "../../../services/api";
import { useSettings } from "../../../global/context/SettingsContext";

// דילוג על refetch אם הבקשה הקודמת הסתיימה לאחרונה - מונע שאילתות מיותרות
// כשהמשתמש עובר בין טאבים תוך שניות.
const REFETCH_SKIP_MS = 30_000;

// ===== מטמון ברמת המודול =====
// כל אזור בדף המנהל הוא עמוד נפרד, וכל חזרה לדשבורד בנתה את הקומפוננטה מחדש
// וטענה הכל מאפס עם שלד טעינה. עכשיו הנתונים האחרונים נשמרים כאן ומוצגים
// מיד, ומתרעננים ברקע. גם עמוד ניהול המנוי קורא מכאן את המשתמשים.
interface AdminCache {
  users: AdminUser[] | null;
  stats: AdminStats | null;
  activities: LoginActivity[];
  usersAt: number;
}
const cache: AdminCache = { users: null, stats: null, activities: [], usersAt: 0 };
let usersInFlight: Promise<AdminUser[]> | null = null;
const usersListeners = new Set<(users: AdminUser[]) => void>();

function setCachedUsers(users: AdminUser[]) {
  cache.users = users;
  usersListeners.forEach((l) => l(users));
}

// טעינת המשתמשים עם איחוד בקשות מקבילות (דשבורד ועמוד מנוי יחד = בקשה אחת)
export function loadAdminUsers(force = false): Promise<AdminUser[]> {
  if (!force && cache.users && Date.now() - cache.usersAt < REFETCH_SKIP_MS) return Promise.resolve(cache.users);
  if (usersInFlight) return usersInFlight;
  usersInFlight = adminApi.getUsers()
    .then((users) => { cache.usersAt = Date.now(); setCachedUsers(users); return users; })
    .finally(() => { usersInFlight = null; });
  return usersInFlight;
}

export const peekAdminUsers = (): AdminUser[] | null => cache.users;

export function subscribeAdminUsers(cb: (users: AdminUser[]) => void): () => void {
  usersListeners.add(cb);
  return () => usersListeners.delete(cb);
}

// עדכון מקומי של מנוי אחרי פעולת אדמין, בכל המסכים שמציגים את המשתמש
export function patchAdminUserPlan(userId: string, plan: 'free' | 'pro', planExpiresAt: string | null = null) {
  if (!cache.users) return;
  setCachedUsers(cache.users.map((u) => u.id === userId
    ? { ...u, plan, planExpiresAt, planSource: undefined, planAutoRenew: false }
    : u));
}

// המרת פעילות API לטיפוס קליינט
const convertApiActivity = (apiActivity: AdminLoginActivity): LoginActivity => ({
  id: apiActivity.id,
  userId: apiActivity.user,
  userName: apiActivity.userName,
  userEmail: apiActivity.userEmail,
  loginMethod: apiActivity.loginMethod,
  timestamp: apiActivity.createdAt,
});

export const useAdminDashboard = (): UseAdminDashboardReturn & { loading: boolean; error: string | null } => {
  const { t } = useSettings();
  // מה שכבר נטען מוצג מיד, בלי שלד טעינה
  const [activities, setActivities] = useState<LoginActivity[]>(cache.activities);
  const [allUsers, setAllUsers] = useState<AdminUser[]>(cache.users ?? []);
  const [serverStats, setServerStats] = useState<AdminStats | null>(cache.stats);
  const [loading, setLoading] = useState(cache.users === null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number>(cache.usersAt);

  useEffect(() => subscribeAdminUsers(setAllUsers), []);

  // מחזיר Promise<boolean> (הצלחה של המשתמשים - הנתון הקריטי) כדי שקוראים
  // כמו רענון בגרירה ידעו אם באמת להציג "עודכן" ומתי להראות חיווי כישלון,
  // במקום טיימר קבוע בלי קשר לתוצאה בפועל (אותו באג שתוקן ב-Insights).
  const fetchData = useCallback(async (force = false): Promise<boolean> => {
    // דילוג אם הנתונים טריים (פחות מ-30 שניות) ולא נדרש רענון מפורש
    if (!force && Date.now() - cache.usersAt < REFETCH_SKIP_MS) return true;
    // שלד טעינה רק כשאין עדיין שום נתון להציג
    if (!cache.users) setLoading(true);
    setError(null);

    // משתמשים = הקריטיים. ברגע שהם חוזרים, loading=false והדף מוצג.
    // סטטיסטיקות ופעילות נטענות במקביל אבל לא מעכבות הצגה ראשונית.
    const usersPromise = loadAdminUsers(true)
      .then(() => {
        setLastFetchAt(cache.usersAt);
        return true;
      })
      .catch(err => { if (import.meta.env.DEV) console.error('admin users:', err); setError(t('adminLoadError')); return false; })
      .finally(() => setLoading(false));

    adminApi.getStats()
      .then(stats => { cache.stats = stats; setServerStats(stats); })
      .catch(err => { if (import.meta.env.DEV) console.error('admin stats:', err); /* not fatal */ });

    // 20 פעילויות מספיקות לתצוגה הראשונית (פיד אחרון). אם המשתמש רוצה
    // היסטוריה מלאה - יש דף נפרד. הקטנת מ-100 ל-20 = פי 5 מהיר.
    adminApi.getLoginActivity(1, 20)
      .then(activityData => {
        cache.activities = activityData.activities
          .map(convertApiActivity)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(cache.activities);
      })
      .catch(err => { if (import.meta.env.DEV) console.error('admin activity:', err); /* not fatal */ });

    return usersPromise;
  }, [t]);

  // טעינה ראשונית בלבד. הסרנו רענון אוטומטי על visibilitychange כי זה
  // היה גורם לטעינה מחדש בכל פעם שאדמין חוזר מטאב אחר → עומס מיותר.
  // אם אדמין רוצה לרענן יש כפתור Refresh במסך.
  useEffect(() => {
    // fetchData מגדיר loading/error מיידית (spinner) לפני הבקשה האסינכרונית -
    // דפוס "fetch on mount" סטנדרטי, אין דרך להימנע מ-setState סינכרוני כאן.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // משתמשים עם סטטיסטיקות התחברות + שדה plan לסינון וה-badge
  const usersWithLoginInfo: UserWithLastLogin[] = useMemo(() => {
    return allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      avatarEmoji: user.avatarEmoji,
      totalLogins: user.totalLogins,
      lastLoginAt: user.lastLoginAt || undefined,
      lastLoginMethod: user.lastLoginMethod || undefined,
      lastAppOpenAt: user.lastAppOpenAt || undefined,
      registrationMethod: (user.googleId ? 'google' : 'email') as 'google' | 'email',
      createdAt: user.createdAt,
      hasPushSubscription: user.hasPushSubscription,
      plan: user.plan ?? 'free',
      planExpiresAt: user.planExpiresAt ?? undefined,
      planSource: user.planSource,
      planAutoRenew: user.planAutoRenew,
    }));
  }, [allUsers]);

  const stats: DashboardStats = useMemo(() => ({
    totalUsers: serverStats?.totalUsers || allUsers.length,
    uniqueUsersToday: serverStats?.uniqueUsersToday || 0,
    loginsToday: serverStats?.loginsToday || 0,
    loginsThisMonth: serverStats?.loginsThisMonth || 0,
    uniqueUsersThisMonth: serverStats?.uniqueUsersThisMonth || 0,
  }), [serverStats, allUsers]);

  // רענון ידני תמיד מתבצע, גם אם הנתונים טריים. מחזיר Promise<boolean>
  // (ראו fetchData) לקוראים כמו רענון בגרירה.
  const refreshData = useCallback((): Promise<boolean> => {
    return fetchData(true);
  }, [fetchData]);

  // עדכון מקומי (בלי refetch מלא) של plan אחרי שאדמין שינה אותו בפועל -
  // בלי זה כרטיס הסטטיסטיקה "X Pro" בכותרת (proCount, נגזר מ-usersWithLoginInfo)
  // נשאר עם המספר הישן עד לרענון מלא הבא, למרות שהשורה הבודדת (state מקומי
  // ב-UserRow) כן מתעדכנת מיד - חוסר סנכרון בין הכרטיס לשורה.
  const updateUserPlanLocal = useCallback((userId: string, plan: 'free' | 'pro') => {
    patchAdminUserPlan(userId, plan);
  }, []);

  return {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    updateUserPlanLocal,
    loading,
    error,
    lastFetchAt: lastFetchAt || undefined,
  };
};
