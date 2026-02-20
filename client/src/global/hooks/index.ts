import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { User, List, Member, Product, LoginMethod } from "../types";
import { authApi, listsApi, pushApi, type ApiList, type ApiMember } from "../../services/api";
import { socketService } from "../../services/socket";
import { getAccessToken, clearTokens } from "../../services/api/client";

// ייצוא חוזר
export { useDebounce } from './useDebounce';
export { useSocketNotifications, type LocalNotification } from './useSocketNotifications';
export { useServiceWorker } from './useServiceWorker';
export { useNotifications } from './useNotifications';
export { usePushNotifications } from './usePushNotifications';
export { usePresence } from './usePresence';

// ===== useToast Hook =====
import type { ToastType } from '../types';

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

// משך הצגה לפי סוג, התראות מידע מוצגות יותר זמן
const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 1500,
  error: 3000,
  info: 5000,  // 5 שניות להודעות התראה, מספיק לקריאה
  warning: 5000 // 5 שניות לאזהרות חשובות
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", key: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, type: ToastType = "success") => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast((prev) => ({ message: msg, type, key: prev.key + 1 }));
      const duration = TOAST_DURATIONS[type];
      timeoutRef.current = setTimeout(() => {
        setToast((prev) => ({ message: "", type: "success", key: prev.key }));
        timeoutRef.current = null;
      }, duration);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast((prev) => ({ message: "", type: "success", key: prev.key }));
  }, []);

  return { message: toast.message, toastType: toast.type, toastKey: toast.key, showToast, hideToast };
}

// טיפוס נתונים ראשוניים לטעינה מקבילית
export interface InitialData {
  lists: ApiList[] | null;
  notifications: { notifications: import('../../services/api').PersistedNotification[]; unreadCount: number } | null;
}

// ===== useAuth Hook =====
export function useAuth() {
  // בדיקת משתמש שמור לרינדור מיידי
  const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 יום
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
        // הסרת _cachedAt מאובייקט המשתמש
        const { _cachedAt: _, ...userData } = parsed;
        return userData as User;
      }
    } catch { /* ignore */ }
    return null;
  });
  // הצגת טעינה בזמן אימות הטוקן וטעינת נתונים ראשוניים
  // מסך הטעינה נשאר מוצג עד שהנתונים מוכנים, מונע הבזק ריק
  const [loading, setLoading] = useState(() => !!getAccessToken());
  // נתונים שנטענו מראש במקביל לפרופיל לטעינה מהירה
  const [initialData, setInitialData] = useState<InitialData>({ lists: null, notifications: null });

  // בדיקת סשן קיים בטעינה
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
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
            import('../../services/api').then(({ notificationsApi }) =>
              notificationsApi.getNotifications({ limit: 50 }).catch(() => null)
            ),
          ]),
          timeout.then(() => { throw new Error('timeout'); }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ]) as any;

        clearTimeout(timeoutId!);

        // שמירת משתמש לטעינה הבאה
        try { localStorage.setItem('cached_user', JSON.stringify({ ...profile, _cachedAt: Date.now() })); } catch { /* quota exceeded */ }
        setUser(profile);

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
      // פעילות כניסה נשמרת בשרת
      // חיבור socket אחרי כניסה
      socketService.connect();
    },
    [],
  );

  const logout = useCallback(async () => {
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

// המרת חבר מפורמט API לפורמט לקוח
export const convertApiMember = (apiMember: ApiMember): Member => ({
  id: apiMember.user.id,
  name: apiMember.user.name,
  email: apiMember.user.email,
  avatarColor: apiMember.user.avatarColor,
  avatarEmoji: apiMember.user.avatarEmoji,
  isAdmin: apiMember.isAdmin,
  joinedAt: apiMember.joinedAt,
});

// המרת מוצר מפורמט API לפורמט לקוח
export const convertApiProduct = (p: ApiList['products'][0]): Product => ({
  id: p.id,
  name: p.name,
  quantity: p.quantity,
  unit: p.unit,
  category: p.category,
  isPurchased: p.isPurchased,
  addedBy: p.addedBy,
  createdAt: p.createdAt,
});

// המרת רשימה מפורמט API לפורמט לקוח
export const convertApiList = (apiList: ApiList): List => ({
  id: apiList.id,
  name: apiList.name,
  icon: apiList.icon,
  color: apiList.color,
  isGroup: apiList.isGroup,
  owner: {
    id: apiList.owner.id,
    name: apiList.owner.name,
    email: apiList.owner.email,
    avatarColor: apiList.owner.avatarColor,
    avatarEmoji: apiList.owner.avatarEmoji,
  },
  members: apiList.members.map(convertApiMember),
  products: apiList.products.map(convertApiProduct),
  inviteCode: apiList.inviteCode,
  password: apiList.password,
  hasPassword: apiList.hasPassword,
  updatedAt: apiList.updatedAt,
});

// ===== useLists Hook =====
export function useLists(user: User | null, initialLists?: ApiList[] | null, authLoading?: boolean) {
  // שימוש ברשימות שנטענו מראש לרינדור מיידי
  const [lists, setLists] = useState<List[]>(() =>
    initialLists ? initialLists.map(l => convertApiList(l)) : []
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  // מעקב איזה משתמש כבר אותחל עם נתונים מראש
  const initializedForRef = useRef<string | null>(initialLists ? '__initial__' : null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const apiLists = await listsApi.getLists();
      setLists(apiLists.map(l => convertApiList(l)));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // סנכרון עם נתונים מראש כשהם מגיעים מטעינה מקבילית
  useEffect(() => {
    if (initialLists && !initializedForRef.current) {
      setLists(initialLists.map(l => convertApiList(l)));
      initializedForRef.current = '__initial__';
    }
  }, [initialLists]);

  // טעינת רשימות כשמשתמש משתנה (דילוג אם כבר אותחל עם נתונים מראש)
  // לא טוענים בזמן אימות ראשוני, מחכים לנתונים מראש
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // משתמש השתנה מאז האתחול האחרון, צריך נתונים חדשים
      if (initializedForRef.current && initializedForRef.current !== user.id) {
        initializedForRef.current = null;
      }
      // דילוג על טעינה אם כבר יש נתונים מראש למשתמש הזה
      if (initializedForRef.current) {
        initializedForRef.current = user.id;
        return;
      }
      initializedForRef.current = user.id;
      fetchLists();
    } else {
      initializedForRef.current = null;
      setLists([]);
      setFetchError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-fetch when user.id changes or auth completes
  }, [authLoading, user?.id, fetchLists]);

  const createList = useCallback(
    async (list: Omit<List, 'id' | 'owner' | 'members' | 'products' | 'notifications'> & { id?: string; owner?: User; members?: Member[]; products?: Product[] }) => {
      // יצירת מזהה זמני לעדכון אופטימיסטי
      const tempId = list.id || `temp_${Date.now()}`;

      // יצירת רשימה אופטימיסטית מיידית
      const optimisticList: List = {
        id: tempId,
        name: list.name,
        icon: list.icon,
        color: list.color,
        isGroup: list.isGroup,
        owner: list.owner || { id: '', name: '', email: '' },
        members: list.members || [],
        products: list.products || [],
        inviteCode: list.inviteCode || null,
        password: list.password || null,
      };

      // הוספה לסטייט מיידית (אופטימיסטי)
      setLists((prev) => [...prev, optimisticList]);

      try {
        // קריאה לשרת ברקע
        const newList = await listsApi.createList({
          name: list.name,
          icon: list.icon,
          color: list.color,
          isGroup: list.isGroup,
          password: list.password || undefined,
        });

        // החלפת הרשימה הזמנית בתגובת השרת
        setLists((prev) => prev.map((l) => l.id === tempId ? convertApiList(newList) : l));

        // הצטרפות לחדר socket של הרשימה החדשה
        socketService.joinList(newList.id);

        return convertApiList(newList);
      } catch (error) {
        // הסרת הרשימה האופטימיסטית בשגיאה
        setLists((prev) => prev.filter((l) => l.id !== tempId));
        throw error;
      }
    },
    [],
  );

  // עדכון מקומי ללא קריאה לשרת (אופטימיסטי)
  const updateListLocal = useCallback(
    (updatedList: List) => {
      setLists((prev) =>
        prev.map((l) => (l.id === updatedList.id ? updatedList : l)),
      );
    },
    [],
  );

  const updateList = useCallback(
    async (updatedList: List) => {
      // מציאת רשימה ישנה להשוואה מה השתנה
      const oldList = lists.find((l) => l.id === updatedList.id);

      // בדיקה אם יש המרה מרשימה פרטית לקבוצה
      const isConverting = updatedList.isGroup && oldList && !oldList.isGroup;
      const updated = await listsApi.updateList(updatedList.id, {
        name: updatedList.name,
        icon: updatedList.icon,
        color: updatedList.color,
        ...(isConverting ? { isGroup: true, password: updatedList.password || undefined } : {}),
      });
      setLists((prev) =>
        prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
      );
      // שליחת אירוע socket לקבוצות להודעה בזמן אמת לחברים
      if (updatedList.isGroup && user && oldList) {
        // זיהוי מה השתנה
        const nameChanged = oldList.name !== updatedList.name;
        const designChanged = oldList.icon !== updatedList.icon || oldList.color !== updatedList.color;

        let changeType: 'name' | 'design' | 'both' | undefined;
        if (nameChanged && designChanged) {
          changeType = 'both';
        } else if (nameChanged) {
          changeType = 'name';
        } else if (designChanged) {
          changeType = 'design';
        }

        socketService.emitListUpdated(
          updatedList.id,
          oldList.name, // שם ישן להקשר
          user.name,
          changeType,
          nameChanged ? updatedList.name : undefined
        );
      }
    },
    [user, lists],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const listToDelete = lists.find((l) => l.id === listId);

      // הסרה מיידית מה-UI (אופטימיסטי)
      setLists((prev) => prev.filter((l) => l.id !== listId));

      try {
        // הודעת socket לחברי הקבוצה ברקע
        if (listToDelete?.isGroup && user) {
          const memberIds = listToDelete.members
            .map((m) => m.id)
            .filter((id) => id !== user.id);
          if (memberIds.length > 0) {
            await new Promise<void>((resolve) => {
              socketService.emitListDeleted(listId, listToDelete.name, memberIds, user.name, () => {
                resolve();
              });
              setTimeout(resolve, 5000);
            });
          }
        }

        await listsApi.deleteList(listId);
      } catch (error) {
        // Rollback - החזרת הרשימה ל-UI
        if (listToDelete) {
          setLists((prev) => [...prev, listToDelete]);
        }
        throw error;
      }
    },
    [lists, user],
  );

  const joinGroup = useCallback(
    async (code: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "userNotLoggedIn" };

      try {
        const joinedList = await listsApi.joinGroup({ inviteCode: code, password });
        setLists((prev) => [...prev, convertApiList(joinedList)]);
        // הצטרפות לחדר socket, הודעה לחברים אחרי אישור השרת
        socketService.joinList(joinedList.id, () => {
          socketService.emitMemberJoined(joinedList.id, joinedList.name, user!.name);
        });
        return { success: true };
      } catch (error: unknown) {
        const apiError = error as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string };
        const status = apiError.response?.status;
        const errorMessage = apiError.response?.data?.message || apiError.response?.data?.error;

        // שגיאת רשת או timeout
        if (apiError.code === 'ERR_NETWORK' || apiError.code === 'ECONNABORTED') {
          return { success: false, error: 'networkError' };
        }

        // מיפוי שגיאות ספציפיות למפתחות תרגום
        if (errorMessage?.toLowerCase().includes('owner')) {
          return { success: false, error: 'youAreOwner' };
        }
        if (status === 404 || errorMessage?.toLowerCase().includes('invalid invite code')) {
          return { success: false, error: 'invalidGroupCode' };
        }
        if (status === 400 || errorMessage?.toLowerCase().includes('invalid password')) {
          return { success: false, error: 'invalidGroupPassword' };
        }
        if (status === 409 || errorMessage?.toLowerCase().includes('already a member')) {
          return { success: false, error: 'alreadyMember' };
        }
        if (status === 429) {
          return { success: false, error: 'tooManyAttempts' };
        }

        return { success: false, error: 'unknownError' };
      }
    },
    [user],
  );

  const leaveList = useCallback(
    async (listId: string) => {
      if (!user) return;

      const listToLeave = lists.find((l) => l.id === listId);

      // הסרה מיידית מה-UI (אופטימיסטי)
      socketService.leaveList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));

      try {
        // הודעת socket לחברי הקבוצה ברקע
        if (listToLeave) {
          await new Promise<void>((resolve) => {
            socketService.emitMemberLeft(listId, listToLeave.name, user.name, () => {
              resolve();
            });
            setTimeout(resolve, 5000);
          });
        }
        await listsApi.leaveGroup(listId);
      } catch (error) {
        // Rollback - החזרת הרשימה ל-UI
        if (listToLeave) {
          socketService.joinList(listId);
          setLists((prev) => [...prev, listToLeave]);
        }
        throw error;
      }
    },
    [user, lists],
  );

  // הסרת רשימה מקומית ללא קריאת API (כשמשתמש הוסר מהקבוצה)
  const removeListLocal = useCallback(
    (listId: string) => {
      socketService.leaveList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    },
    [],
  );

  // עדכון מוצרים אטומי - משתמש ב-functional state update למניעת stale closures
  const updateProductsForList = useCallback(
    (listId: string, updater: (products: Product[]) => Product[]) => {
      setLists((prev) =>
        prev.map((l) => l.id === listId ? { ...l, products: updater(l.products) } : l),
      );
    },
    [],
  );

  // חילוץ מזהי רשימות למעקב תלויות יציב
  const listIds = useMemo(() => lists.map(l => l.id).join(','), [lists]);

  // משתנים לטעינה מחדש מושהית (מונע קריאות API כפולות לאותה רשימה)
  const pendingRefetchIds = useRef<Set<string>>(new Set());
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // הרשמה לאירועי socket לעדכונים בזמן אמת
  useEffect(() => {
    if (!user) return;

    // פירוק מזהי רשימות מהמחרוזת
    const currentIds = listIds ? listIds.split(',') : [];

    // הצטרפות לכל חדרי הרשימות
    currentIds.forEach((id) => socketService.joinList(id));

    // טעינה מחדש מושהית, מאחדת בקשות מרובות לאותה רשימה
    const scheduleRefetch = (listId: string) => {
      pendingRefetchIds.current.add(listId);

      // ניקוי טיימר קיים
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }

      // תזמון טעינה מחדש אחרי 100ms ללא אירועים חדשים
      refetchTimeoutRef.current = setTimeout(() => {
        const idsToRefetch = Array.from(pendingRefetchIds.current);
        pendingRefetchIds.current.clear();

        // טעינת כל רשימה פעם אחת בלבד
        idsToRefetch.forEach((id) => {
          listsApi.getList(id).then((updated) => {
            setLists((prev) =>
              prev.map((l) => {
                if (l.id !== updated.id) return l;
                return convertApiList(updated);
              }),
            );
          }).catch(() => {
            // טעינה נכשלה, נתונים ישנים יוצגו עד הסנכרון הבא
          });
        });
      }, 100);
    };

    // האזנה לעדכוני רשימות
    const unsubscribeListUpdated = socketService.on('list:updated', (data: unknown) => {
      const listData = data as { listId: string };
      scheduleRefetch(listData.listId);
    });

    // הערה: אירועי user:joined ו user:left הם למעקב נוכחות בלבד
    // (חיבור/ניתוק socket של משתמש לחדר).
    // הם נשלחים בכל פתיחת אפליקציה, רענון, או התחברות מחדש, לא בשינויי חברות בפועל.
    // שינויי חברות אמיתיים עוברים דרך REST API ונשמרים כהתראות ב DB.
    // בכוונה לא טוענים מחדש נתוני רשימות באירועים אלו כדי למנוע:
    // 1. קריאות API מיותרות בכל התחברות מחדש
    // 2. בלבול משתמשים עם פעילות כשמישהו רק מתחבר מחדש

    // האזנה לאירועי מוצרים, כולם משתמשים בטעינה מושהית
    const unsubscribeProductAdded = socketService.on('product:added', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductUpdated = socketService.on('product:updated', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductDeleted = socketService.on('product:deleted', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductToggled = socketService.on('product:toggled', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    // האזנה לשינויי חברות (הצטרפות/עזיבה/הסרה) לעדכון רשימת החברים
    const unsubscribeNotificationNew = socketService.on('notification:new', (data: unknown) => {
      const eventData = data as { type: string; listId: string; userId: string };
      // טעינה מחדש רק בשינויי חברות, לא בסוגי התראות אחרים
      if (['join', 'leave', 'removed'].includes(eventData.type)) {
        scheduleRefetch(eventData.listId);
      }
    });

    return () => {
      // ניקוי טיימר טעינה ממתינה
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      unsubscribeListUpdated();
      unsubscribeProductAdded();
      unsubscribeProductUpdated();
      unsubscribeProductDeleted();
      unsubscribeProductToggled();
      unsubscribeNotificationNew();
      // יציאה מכל החדרים בניקוי
      currentIds.forEach((id) => socketService.leaveList(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when user.id or list IDs change
  }, [user?.id, listIds]);

  // טעינת כל הרשימות מחדש כשהאפליקציה חוזרת לחזית (למשל אחרי לחיצה על התראה)
  // אירועי socket שנשלחו בזמן שהאפליקציה ברקע אבדו, לכן צריך טעינה חדשה
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLists();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, fetchLists]);

  return {
    lists,
    loading,
    fetchError,
    createList,
    updateList,
    updateListLocal,
    updateProductsForList,
    deleteList,
    joinGroup,
    leaveList,
    removeListLocal,
    refetch: fetchLists,
  };
}
