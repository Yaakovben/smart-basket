import { lazy, Suspense, useMemo, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import type { User, List, Product, LoginMethod, ToastType } from "../global/types";
import { useAuth, useLists, useToast, useSocketNotifications, useNotifications, usePushNotifications, usePresence } from "../global/hooks";
import { Toast, PageSkeleton } from "../global/components";
import { useSettings } from "../global/context/SettingsContext";
import { ADMIN_CONFIG } from "../global/constants";
import { authApi } from "../services/api";
import { hideInitialLoader } from "../App";

// טעינה ישירה של דף התחברות בלבד
import { LoginPage } from "../features/auth/auth";

// טעינה עצלה של כל הדפים כולל דף הבית (prefetch מיידי)
const homeImport = () => import("../features/home/home").then(m => ({ default: m.HomePage }));
homeImport(); // prefetch מיידי במקביל לאימות
const HomePage = lazy(homeImport);
const ListPage = lazy(() => import("../features/list/list").then(m => ({ default: m.ListPage })));
const ProfilePage = lazy(() => import("../features/profile/profile").then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("../features/settings/settings").then(m => ({ default: m.SettingsPage })));
const PrivacyPolicy = lazy(() => import("../features/legal/legal").then(m => ({ default: m.PrivacyPolicy })));
const AdminPage = lazy(() => import("../features/admin/admin").then(m => ({ default: m.AdminPage })));
const ClearCachePage = lazy(() => import("../features/utils/utils").then(m => ({ default: m.ClearCachePage })));
const InsightsPage = lazy(() => import("../features/insights/components/InsightsPage").then(m => ({ default: m.InsightsPage })));

// מסך טעינה, שלד עמוד במקום גרדיאנט ריק
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

  // קבוצה יציבה של משתמשים מקוונים ברשימה הנוכחית
  const onlineArr = listId ? onlineUsers[listId] : undefined;
  const onlineUserIds = useMemo(() => new Set(onlineArr || []), [onlineArr]);

  if (!list) return <Navigate to="/" replace />;

  return (
    <ListPage
      list={list}
      user={user}
      onBack={() => navigate("/")}
      onUpdateList={updateList}
      onUpdateListLocal={updateListLocal}
      onUpdateProductsForList={updateProductsForList}
      onLeaveList={async (id: string) => {
        try {
          await leaveList(id);
          showToast(t('left'));
          navigate("/");
        } catch {
          showToast(t('errorOccurred'), 'error');
        }
      }}
      onDeleteList={async (id: string) => {
        try {
          await deleteList(id);
          showToast(t('deleted'));
          navigate("/");
        } catch {
          showToast(t('errorOccurred'), 'error');
        }
      }}
      showToast={showToast}
      onlineUserIds={onlineUserIds}
    />
  );
};

// ראוטר ראשי
export const AppRouter = () => {
  const navigate = useNavigate();
  const { t } = useSettings();

  // hooks חייבים להיקרא לפני כל return מותנה
  const { user, login, logout, updateUser, loading: authLoading, initialData } = useAuth();
  // נתונים שנטענו מראש לטעינה מהירה יותר
  const { lists, fetchError: listsFetchError, createList, updateList, updateListLocal, updateProductsForList, deleteList, joinGroup, leaveList, removeListLocal } = useLists(user, initialData.lists, authLoading);
  const { message: toast, toastType, toastKey, onUndo, showToast, hideToast } = useToast();
  const { isSubscribed: isPushSubscribed } = usePushNotifications();
  const listIdsForPresence = useMemo(() => lists.map(l => l.id), [lists]);
  const onlineUsers = usePresence(listIdsForPresence);

  // הסתרת loader ראשוני כשבדיקת האימות הושלמה
  useEffect(() => {
    if (!authLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          hideInitialLoader();
        });
      });
    }
  }, [authLoading]);

  // ניווט מלחיצה על push notification (מ-Service Worker)
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
    try {
      // מחיקת חשבון מהשרת
      await authApi.deleteAccount();

      localStorage.clear();

      // ניקוי cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // ביטול רישום Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // התנתקות וניווט לדף התחברות
      logout();
      navigate("/login");
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  }, [logout, navigate, showToast, t]);

  // בזמן טעינת אימות לא מציגים כלום (מסך loader מוצג)
  if (authLoading) {
    return null;
  }

  const handleLogin = (u: User, loginMethod: LoginMethod = 'email') => {
    // מונע שהניווט יקרה לפני עדכון הסטייט (flushSync)
    flushSync(() => {
      login(u, loginMethod);
    });
    navigate("/");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleJoinGroup = async (code: string, password: string) => {
    const result = await joinGroup(code, password);
    if (result.success) showToast(t('joinedGroup'));
    return result;
  };

  const handleUpdateUser = async (updates: Partial<User>) => {
    try {
      await updateUser(updates);
      showToast(t('profileUpdated'));
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  };

  // handlers שלא תופסים שגיאות - useHome מטפל ב-UI (ספינר, טוסט, שגיאה)
  const handleCreateList = async (list: { name: string; icon: string; color: string; isGroup: boolean; password?: string | null }) => {
    await createList(list);
  };

  const handleDeleteList = async (id: string) => {
    await deleteList(id);
  };

  const handleEditList = async (list: List) => {
    await updateList(list);
  };

  return (
    <>
      <Suspense fallback={<PageLoader />}>
      <Box sx={{
        '@keyframes pageIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        animation: 'pageIn 0.25s ease-out',
      }}>
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
                listsFetchError={listsFetchError || initialData.connectionError}
                user={user!}
                onSelectList={(list: List) => navigate(`/list/${list.id}`)}
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
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute user={user}>
              <InsightsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Box>
      </Suspense>
      <Toast key={toastKey} msg={toast} type={toastType} onDismiss={hideToast} onUndo={onUndo} />
    </>
  );
}
