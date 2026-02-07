import { lazy, Suspense, useMemo, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import type { User, List, LoginMethod, ToastType } from "../global/types";
import { useAuth, useLists, useToast, useSocketNotifications, useNotifications, usePushNotifications, usePresence } from "../global/hooks";
import { Toast } from "../global/components";
import { useSettings } from "../global/context/SettingsContext";
import { ADMIN_CONFIG } from "../global/constants";
import { authApi } from "../services/api";
import { hideInitialLoader } from "../App";

// Load main pages directly (no lazy) for instant display after auth
import { LoginPage } from "../features/auth/auth";
import { HomePage } from "../features/home/home";

// Lazy load secondary pages
const ListPage = lazy(() => import("../features/list/list").then(m => ({ default: m.ListPage })));
const ProfilePage = lazy(() => import("../features/profile/profile").then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("../features/settings/settings").then(m => ({ default: m.SettingsPage })));
const PrivacyPolicy = lazy(() => import("../features/legal/legal").then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("../features/legal/legal").then(m => ({ default: m.TermsOfService })));
const AdminPage = lazy(() => import("../features/admin/admin").then(m => ({ default: m.AdminPage })));
const ClearCachePage = lazy(() => import("../features/utils/utils").then(m => ({ default: m.ClearCachePage })));

// Loading fallback - same green gradient as initial loader, seamless transition
const PageLoader = () => (
  <Box sx={{
    height: '100vh',
    background: 'linear-gradient(135deg, #2DD4BF, #34D399)'
  }} />
);

// Protected Route wrapper
const ProtectedRoute = ({ children, user }: { children: React.ReactNode; user: User | null }) => {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Admin Route wrapper - only allows admin user
const AdminRoute = ({ children, user }: { children: React.ReactNode; user: User | null }) => {
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.email === ADMIN_CONFIG.adminEmail;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// List Page Wrapper with URL params
const ListPageWrapper = ({
  lists,
  user,
  updateList,
  updateListLocal,
  leaveList,
  deleteList,
  showToast,
  onlineUsers,
}: {
  lists: List[];
  user: User;
  updateList: (list: List) => void;
  updateListLocal: (list: List) => void;
  leaveList: (id: string) => void;
  deleteList: (id: string) => void;
  showToast: (msg: string, type?: ToastType) => void;
  onlineUsers: Record<string, string[]>;
}) => {
  const navigate = useNavigate();
  const { listId } = useParams();
  const { t } = useSettings();
  const list = lists.find((l) => l.id === listId);

  // Derive a stable Set for the current list's online users
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
      onLeaveList={(id: string) => {
        leaveList(id);
        showToast(t('left'));
        navigate("/");
      }}
      onDeleteList={(id: string) => {
        deleteList(id);
        showToast(t('deleted'));
        navigate("/");
      }}
      showToast={showToast}
      onlineUserIds={onlineUserIds}
    />
  );
};

// Main App Router
export const AppRouter = () => {
  const navigate = useNavigate();
  const { t } = useSettings();

  // Hooks for state management - ALL hooks must be called before any conditional returns
  const { user, login, logout, updateUser, loading: authLoading, initialData } = useAuth();
  // Pass pre-fetched data for faster initial load (fetched in parallel with auth)
  const { lists, createList, updateList, updateListLocal, deleteList, joinGroup, leaveList, removeListLocal } = useLists(user, initialData.lists);
  const { message: toast, toastType, showToast, hideToast } = useToast();
  const { isSubscribed: isPushSubscribed } = usePushNotifications();
  const onlineUsers = usePresence();

  // Hide initial loader when auth check is complete
  useEffect(() => {
    if (!authLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          hideInitialLoader();
        });
      });
    }
  }, [authLoading]);

  // Persisted notifications (loaded from API, updated in real-time via socket)
  // Pass pre-fetched data for faster initial load
  const {
    notifications: persistedNotifications,
    loading: notificationsLoading,
    markAsRead: markPersistedNotificationRead,
    markAllAsRead: clearAllPersistedNotifications,
    addNotification: addPersistedNotification,
  } = useNotifications(user, initialData.notifications);

  // Create list names map for notifications
  const listNames = useMemo(() =>
    lists.reduce((acc, list) => ({ ...acc, [list.id]: list.name }), {} as Record<string, string>),
    [lists]
  );

  // Callback when current user is removed from a group
  const handleMemberRemoved = useCallback((listId: string) => {
    removeListLocal(listId);
    // If currently viewing the removed list, navigate away
    if (window.location.pathname.includes(listId)) {
      navigate('/');
    }
  }, [removeListLocal, navigate]);

  // Callback when a group is deleted by owner
  const handleListDeleted = useCallback((listId: string) => {
    removeListLocal(listId);
    // If currently viewing the deleted list, navigate away
    if (window.location.pathname.includes(listId)) {
      navigate('/');
    }
  }, [removeListLocal, navigate]);

  // Subscribe to socket notifications (respects notification settings)
  // The addPersistedNotification callback adds real-time notifications to the persisted list
  useSocketNotifications(user, showToast, listNames, addPersistedNotification, handleMemberRemoved, handleListDeleted, isPushSubscribed);

  const handleDeleteAllData = useCallback(async () => {
    try {
      // 1. Delete user account from server (also clears tokens)
      await authApi.deleteAccount();

      // 2. Clear all localStorage
      localStorage.clear();

      // 3. Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 4. Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 5. Logout locally and navigate to login
      logout();
      navigate("/login");
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  }, [logout, navigate, showToast, t]);

  // Show nothing while auth is loading (initial loader from HTML is visible)
  if (authLoading) {
    return null;
  }

  // Handlers
  const handleLogin = (u: User, loginMethod: LoginMethod = 'email') => {
    // Use flushSync to ensure user state is updated before navigation
    // This prevents race condition where navigation happens before state update
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
    await updateUser(updates);
    showToast(t('profileUpdated'));
  };

  const handleCreateList = (list: List) => {
    createList(list);
    showToast(t('created'));
  };

  const handleDeleteList = (id: string) => {
    deleteList(id);
    showToast(t('deleted'));
  };

  const handleEditList = (list: List) => {
    updateList(list);
    showToast(t('saved'));
  };

  return (
    <>
      <Suspense fallback={<PageLoader />}>
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
                user={user!}
                onSelectList={(list: List) => navigate(`/list/${list.id}`)}
                onCreateList={handleCreateList}
                onDeleteList={handleDeleteList}
                onEditList={handleEditList}
                onJoinGroup={handleJoinGroup}
                onLogout={handleLogout}
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
              <SettingsPage user={user!} hasUpdate={false} onDeleteAllData={handleDeleteAllData} />
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/clear-cache" element={<ClearCachePage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute user={user}>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <Toast msg={toast} type={toastType} onDismiss={hideToast} />
    </>
  );
}
