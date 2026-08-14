import { lazy, Suspense, useMemo, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import type { User, List, Product, LoginMethod, ToastType } from "../global/types";
import { useAuth, useLists, useToast, useSocketNotifications, useNotifications, usePushNotifications, usePresence, useOfflineSync } from "../global/hooks";
import { Toast, PageSkeleton, ErrorBoundary } from "../global/components";
import { DailyFaithAutoPopup } from "../features/daily-faith";
// OnboardingGate הוסר - פופאפ הסבר על האפליקציה לא רצוי יותר
import { useSettings } from "../global/context/SettingsContext";
import { ADMIN_CONFIG } from "../global/constants";
import { authApi } from "../services/api";
import { hideInitialLoader } from "../global/helpers/initialLoader";
import { setFetchIssue } from "../global/services/connectionIssue";

// טעינה ישירה של דף התחברות בלבד
import { LoginPage } from "../features/auth/pages/LoginPage";

// טעינה עצלה של כל הדפים כולל דף הבית (prefetch מיידי)
const homeImport = () => import("../features/home/home").then(m => ({ default: m.HomePage }));
homeImport(); // prefetch מיידי במקביל לאימות
const HomePage = lazy(homeImport);
const listImport = () => import("../features/list/list").then(m => ({ default: m.ListPage }));
listImport(); // prefetch מיידי - מונע עיכוב בלחיצה על רשימה
const ListPage = lazy(listImport);
const profileImport = () => import("../features/profile/profile").then(m => ({ default: m.ProfilePage }));
const ProfilePage = lazy(profileImport);
const settingsImport = () => import("../features/settings/settings").then(m => ({ default: m.SettingsPage }));
const SettingsPage = lazy(settingsImport);
const PrivacyPolicy = lazy(() => import("../features/legal/legal").then(m => ({ default: m.PrivacyPolicy })));
const AdminPage = lazy(() => import("../features/admin/admin").then(m => ({ default: m.AdminPage })));
const ClearCachePage = lazy(() => import("../features/utils/ClearCachePage").then(m => ({ default: m.ClearCachePage })));
const insightsImport = () => import("../features/insights/components/InsightsPage").then(m => ({ default: m.InsightsPage }));
const InsightsPage = lazy(insightsImport);

// prefetch מושהה לזמן סרק: Home+List נטענים מיידית (ניווט ראשוני),
// שאר הדפים (Profile/Settings/Insights = 600+ kB) ממתינים שהדף יתייצב.
// InsightsPage לבדו שוקל 451kB — טעינתו המיידית גרמה לתחרות רשת עם
// הטעינה הראשונית והאיטה את הרינדור הראשון.
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(() => { profileImport(); settingsImport(); insightsImport(); }, { timeout: 4000 });
} else {
  setTimeout(() => { profileImport(); settingsImport(); insightsImport(); }, 2000);
}
const AiAssistantPage = lazy(() => import("../features/aiAssistant/aiAssistant").then(m => ({ default: m.AiAssistantPage })));

// ניתוב QR - שומר code+password ומפנה לדף הבית
const JoinRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code') || '';
  const password = params.get('password') || '';
  if (code) {
    // localStorage כדי שהנתונים יהיו זמינים גם ב-PWA
    localStorage.setItem('sb_join_code', code);
    if (password) localStorage.setItem('sb_join_password', password);
  }
  return <Navigate to="/" replace />;
};

const PageLoader = PageSkeleton;

// עטיפת נתיב מוגן
const ProtectedRoute = ({ children, user }: { children: React.ReactNode; user: User | null }) => {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// עטיפת נתיב מנהל
const AdminRoute = ({ children, user }: { children: React.ReactNode; user: User | null }) => {
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.email === ADMIN_CONFIG.adminEmail;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// עטיפת דף רשימה עם פרמטרי URL
const ListPageWrapper = ({
  lists,
  user,
  updateList,
  updateListLocal,
  updateProductsForList,
  leaveList,
  deleteList,
  showToast,
  onlineUsers,
}: {
  lists: List[];
  user: User;
  updateList: (list: List) => void;
  updateListLocal: (list: List) => void;
  updateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  leaveList: (id: string) => void;
  deleteList: (id: string) => void;
  showToast: (msg: string, type?: ToastType, onUndo?: () => void) => void;
  onlineUsers: Record<string, string[]>;
}) => {
  const navigate = useNavigate();
  const { listId } = useParams();
  const { t } = useSettings();
  const list = lists.find((l) => l.id === listId);

  const onlineArr = listId ? onlineUsers[listId] : undefined;
  const onlineUserIds = useMemo(() => new Set(onlineArr || []), [onlineArr]);

  const handleBack = useCallback(() => navigate("/"), [navigate]);
  const handleLeaveList = useCallback(async (id: string) => {
    try {
      await leaveList(id);
      showToast(t('left'));
      navigate("/");
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  }, [leaveList, showToast, t, navigate]);
  const handleDeleteList = useCallback(async (id: string) => {
    try {
      await deleteList(id);
      showToast(t('deleted'));
      navigate("/");
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  }, [deleteList, showToast, t, navigate]);

  if (!list) return <Navigate to="/" replace />;

  return (
    <ListPage
      list={list}
      user={user}
      onBack={handleBack}
      onUpdateList={updateList}
      onUpdateListLocal={updateListLocal}
      onUpdateProductsForList={updateProductsForList}
      onLeaveList={handleLeaveList}
      onDeleteList={handleDeleteList}
      showToast={showToast}
      onlineUserIds={onlineUserIds}
    />
  );
};

// ראוטר ראשי
export const AppRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useSettings();

  // hooks חייבים להיקרא לפני כל return מותנה
  const { user, login, logout, updateUser, loading: authLoading, initialData } = useAuth();
  // נתונים שנטענו מראש לטעינה מהירה יותר
  const { lists, fetchError: listsFetchError, loading: listsLoading, createList, updateList, updateListLocal, updateProductsForList, deleteList, joinGroup, leaveList, removeListLocal } = useLists(user, initialData.lists, authLoading);
  const { message: toast, toastType, toastKey, onUndo, showToast, hideToast } = useToast();
  const { isSubscribed: isPushSubscribed } = usePushNotifications();
  const listIdsForPresence = useMemo(() => lists.map(l => l.id), [lists]);
  const onlineUsers = usePresence(listIdsForPresence);
  useOfflineSync(user?.id, updateProductsForList, showToast, t('syncItemFailed'));

  // הסתרת loader ראשוני כשבדיקת האימות הושלמה.
  // ממתינים לפריים הבא (requestAnimationFrame) כדי לוודא שתוכן React
  // צויר בפועל לפני שמסירים את ה-loader — מונע הבהוב לבן של שבריר שנייה.
  useEffect(() => {
    if (!authLoading) {
      const raf = requestAnimationFrame(() => hideInitialLoader());
      return () => cancelAnimationFrame(raf);
    }
  }, [authLoading]);

  // הודעות מ-Service Worker: ניווט מהתראות בלבד.
  //
  // בעבר היה כאן גם רענון כפוי (window.location.reload) כשגרסה חדשה של
  // ה-SW השתלטה, כדי לסנכרן JS ישן מול SW חדש. הוסר לגמרי: כל ניסיון
  // לתזמן את הרענון "בזמן בטוח" (רק ברקע) עדיין השאיר סיכון שהוא יקטע
  // בקשת רשת שרצה באותו רגע בדיוק - כולל רענון טוקן - וזו הייתה הסיבה
  // בפועל ל"נזרק ללוגין" בלי שום פעולה מצד המשתמש. אין דרך בטוחה ב-100%
  // לדעת שאף בקשה לא באוויר, אז עדיף לוותר על הסנכרון האוטומטי לגמרי:
  // ה-SW החדש כבר משתלט על כל ניווט/טעינה טבעית הבאה (headers של
  // Cache-Control: no-cache על index.html/sw.js בvercel.json דואגים
  // לכך), בלי שום reload יזום שעלול לקטוע session פעיל.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [navigate]);

  // התראות שמורות, נטענות מהשרת ומתעדכנות בזמן אמת
  const {
    notifications: persistedNotifications,
    loading: notificationsLoading,
    fetchError: notificationsFetchError,
    markAsRead: markPersistedNotificationRead,
    markAllAsRead: clearAllPersistedNotifications,
    addNotification: addPersistedNotification,
  } = useNotifications(user, initialData.notifications, authLoading);

  // הצגת שגיאה כשטעינת רשימות או התראות נכשלת
  // לא מציג בזמן אימות ראשוני, מונע הודעה מיותרת כשטוקן פג
  useEffect(() => {
    if (!authLoading && (listsFetchError || notificationsFetchError)) {
      showToast(t('errorOccurred'), 'error');
    }
  }, [authLoading, listsFetchError, notificationsFetchError, showToast, t]);

  // מדווח על כשל fetch לרכיב הגלובלי היחיד שמציג "אין קליטה" (OfflineBanner ב-App.tsx)
  // - כך אין רכיב נפרד ליד הפעמון, ואייקון החיבור מזהה גם כשל fetch וגם ניתוק socket.
  useEffect(() => {
    setFetchIssue(!authLoading && !!(listsFetchError || notificationsFetchError));
  }, [authLoading, listsFetchError, notificationsFetchError]);

  // מיפוי שמות רשימות להתראות
  const listNames = useMemo(() =>
    lists.reduce((acc, list) => ({ ...acc, [list.id]: list.name }), {} as Record<string, string>),
    [lists]
  );

  // כשהמשתמש הנוכחי הוסר מרשימה
  const handleMemberRemoved = useCallback((listId: string) => {
    removeListLocal(listId);
    // ניווט הרחק אם צופים ברשימה שהוסרנו ממנה
    if (window.location.pathname.includes(listId)) {
      navigate('/');
    }
  }, [removeListLocal, navigate]);

  // כשרשימה נמחקה ע"י הבעלים
  const handleListDeleted = useCallback((listId: string) => {
    removeListLocal(listId);
    // ניווט הרחק אם צופים ברשימה שנמחקה
    if (window.location.pathname.includes(listId)) {
      navigate('/');
    }
  }, [removeListLocal, navigate]);

  // הרשמה להתראות דרך socket, מכבד הגדרות התראות
  useSocketNotifications(user, showToast, listNames, addPersistedNotification, handleMemberRemoved, handleListDeleted, isPushSubscribed);

  const handleDeleteAllData = useCallback(async () => {
    // שלב 1: בקשת מחיקה לשרת. אם נכשל - לא נוגעים בכלום.
    // 401/404 מתפרשים כ"הקשבון כבר לא קיים" → המשך כרגיל לניקוי מקומי.
    // ה-axios interceptor מנסה refresh על 401, אבל בגלל שזו DELETE לא רגישה
    // לנסיון חוזר, אין צורך לתפוס מקרה זה במיוחד.
    try {
      await authApi.deleteAccount();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const isAlreadyGone = status === 401 || status === 403 || status === 404;
      if (!isAlreadyGone) {
        showToast(t('errorOccurred'), 'error');
        return;
      }
      // החשבון כבר נמחק (אולי מטאב אחר) - ממשיכים לניקוי מקומי כדי להחזיר
      // את הלקוח למצב נקי.
    }

    // שלב 2: ניקוי async מקדים של SW + caches עם timeout. ה-await כאן בטוח כי
    // React לא קורא מ-caches/SW כדי לעדכן state. ה-timeout מבטיח שלא נחכה
    // לנצח אם הדפדפן תקוע (קרה ב-Chrome ישן + iOS Safari לפעמים).
    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([
        p.catch(() => null as T | null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
      ]);

    await withTimeout(
      (async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      })(),
      2000,
    );
    await withTimeout(
      (async () => {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }
      })(),
      2000,
    );

    // שלב 3: ניקוי storage ו-hard-redirect - הכל סינכרוני וברצף, בלי await
    // ביניהם, כדי שלא ייפתח חלון שבו React רץ עם storage חצי-מנוקה.
    try { localStorage.clear(); } catch { /* ignore */ }
    try { sessionStorage.clear(); } catch { /* ignore */ }
    try {
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase('sb_auth');
        indexedDB.deleteDatabase('sb_offline_queue');
      }
    } catch { /* ignore */ }
    // replace (לא assign) כדי שלא ניתן יהיה לחזור עם 'אחורה' למצב המחוק.
    window.location.replace('/login');
  }, [showToast, t]);

  // כל ה-hooks (כולל useCallback) חייבים להיקרא לפני ה-early return למטה,
  // אחרת מספר ה-hooks משתנה בין הרינדור שבו authLoading=true לרינדור שבו
  // הוא הופך ל-false, וריאקט זורק "Rendered more hooks than during the
  // previous render" (קורס לכל האפליקציה בכל התחברות טרייה).
  const handleLogin = useCallback((u: User, loginMethod: LoginMethod = 'email') => {
    // מונע שהניווט יקרה לפני עדכון הסטייט (flushSync)
    flushSync(() => {
      login(u, loginMethod);
    });
    navigate("/");
  }, [login, navigate]);

  // handlers שלא תופסים שגיאות - useHome מטפל ב-UI (ספינר, טוסט, שגיאה).
  // useCallback - פרופים יציבים מונעים re-render של HomePage memo'd ושל סבים.
  const handleCreateList = useCallback(async (list: { name: string; icon: string; color: string; isGroup: boolean; password?: string | null }) => {
    await createList(list);
  }, [createList]);

  const handleDeleteList = useCallback(async (id: string) => {
    await deleteList(id);
  }, [deleteList]);

  const handleEditList = useCallback(async (list: List) => {
    await updateList(list);
  }, [updateList]);

  const handleSelectList = useCallback((list: List) => {
    navigate(`/list/${list.id}`);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleJoinGroup = useCallback(async (code: string, password: string) => {
    const result = await joinGroup(code, password);
    if (result.success) showToast(t('joinedGroup'));
    return result;
  }, [joinGroup, showToast, t]);

  // בזמן טעינת אימות לא מציגים כלום (מסך loader מוצג)
  if (authLoading) {
    return null;
  }

  const handleUpdateUser = async (updates: Partial<User>) => {
    try {
      await updateUser(updates);
      showToast(t('profileUpdated'));
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  };

  return (
    <>
      {/* ה-toast 'טוען את הרשימות שלך' הוסר - השלד של כרטיסי הרשימות
          ב-HomeComponent כבר נותן ללקוח אינדיקציה ברורה שמשהו טוען. */}
      <Suspense fallback={<PageLoader />}>
      <Box
        // ה-key נכפה לפי המקטע הראשון של ה-pathname (/, /list, /insights וכו)
        // כדי שה-fade ייכנס מחדש בכל מעבר דף. ניווט בין רשימות (/list/A → /list/B)
        // לא ייגרום ל-fade מיותר.
        key={'/' + (location.pathname.split('/')[1] || '')}
        sx={{
          // fade בלבד (ללא transform) - transform על אב היה גורם ל-position:fixed
          // של הבר/FAB להיתפס לאב הזה במקום לויאופורט.
          '@keyframes pageIn': { from: { opacity: 0 }, to: { opacity: 1 } },
          animation: 'pageIn 0.28s ease-out',
        }}
      >
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute user={user}>
              <HomePage
                lists={lists}
                listsLoading={listsLoading}
                listsFetchError={listsFetchError || initialData.connectionError}
                user={user!}
                onSelectList={handleSelectList}
                onCreateList={handleCreateList}
                onDeleteList={handleDeleteList}
                onLeaveList={leaveList}
                onEditList={handleEditList}
                onJoinGroup={handleJoinGroup}
                onLogout={handleLogout}
                showToast={showToast}
                persistedNotifications={persistedNotifications}
                notificationsLoading={notificationsLoading}
                onMarkPersistedNotificationRead={markPersistedNotificationRead}
                onClearAllPersistedNotifications={clearAllPersistedNotifications}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/list/:listId"
          element={
            <ProtectedRoute user={user}>
              <ErrorBoundary>
              <ListPageWrapper
                lists={lists}
                user={user!}
                updateList={updateList}
                updateListLocal={updateListLocal}
                updateProductsForList={updateProductsForList}
                leaveList={leaveList}
                deleteList={deleteList}
                showToast={showToast}
                onlineUsers={onlineUsers}
              />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfilePage
                user={user!}
                onUpdateUser={handleUpdateUser}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute user={user}>
              <SettingsPage user={user!} hasUpdate={false} onDeleteAllData={handleDeleteAllData} showToast={showToast} />
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<PrivacyPolicy />} />
        <Route path="/clear-cache" element={<ClearCachePage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute user={user}>
              <ErrorBoundary><AdminPage /></ErrorBoundary>
            </AdminRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><InsightsPage /></ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute user={user}>
              <ErrorBoundary><AiAssistantPage /></ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/join" element={<JoinRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Box>
      </Suspense>
      <Toast key={toastKey} msg={toast} type={toastType} onDismiss={hideToast} onUndo={onUndo} />
      {/* אין רכיב חיבור נפרד כאן - כשל fetch מדווח דרך setFetchIssue() (למעלה)
          ל-OfflineBanner הגלובלי היחיד (mounted תמיד ב-App.tsx, קבוע מתחת
          לפעמון בכל עמוד), שמזהה גם את זה וגם ניתוק socket. ראו OfflineBanner.tsx. */}
      <DailyFaithAutoPopup enabled={!!user && !authLoading} />
      {/* OnboardingGate (פופאפ הסבר על האפליקציה) הוסר לפי בקשת המשתמש */}
    </>
  );
}
