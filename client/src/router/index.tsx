import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import type { User, List, LoginMethod } from "../global/types";
import { useAuth, useLists, useToast } from "../global/hooks";
import { Toast } from "../global/components";
import { useSettings } from "../global/context/SettingsContext";
import { ADMIN_CONFIG } from "../global/constants";

// Lazy load pages
const LoginPage = lazy(() => import("../features/auth/auth").then(m => ({ default: m.LoginPage })));
const HomePage = lazy(() => import("../features/home/home").then(m => ({ default: m.HomePage })));
const ListPage = lazy(() => import("../features/list/list").then(m => ({ default: m.ListPage })));
const ProfilePage = lazy(() => import("../features/profile/profile").then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("../features/settings/settings").then(m => ({ default: m.SettingsPage })));
const PrivacyPolicy = lazy(() => import("../features/legal/legal").then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("../features/legal/legal").then(m => ({ default: m.TermsOfService })));
const AdminPage = lazy(() => import("../features/admin/admin").then(m => ({ default: m.AdminPage })));

// Loading fallback
const PageLoader = () => (
  <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress color="primary" />
  </Box>
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
  leaveList,
  deleteList,
  showToast,
}: {
  lists: List[];
  user: User;
  updateList: (list: List) => void;
  leaveList: (id: string) => void;
  deleteList: (id: string) => void;
  showToast: (msg: string) => void;
}) => {
  const navigate = useNavigate();
  const { listId } = useParams();
  const { t } = useSettings();
  const list = lists.find((l) => l.id === listId);

  if (!list) return <Navigate to="/" replace />;

  return (
    <ListPage
      list={list}
      user={user}
      onBack={() => navigate("/")}
      onUpdateList={updateList}
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
    />
  );
};

// Main App Router
export const AppRouter = () => {
  const navigate = useNavigate();
  const { t } = useSettings();

  // Hooks for state management
  const { user, login, logout, updateUser } = useAuth();
  const { lists, createList, updateList, deleteList, joinGroup, leaveList, markNotificationsRead, markSingleNotificationRead } = useLists(user);
  const { message: toast, showToast } = useToast();

  // Handlers
  const handleLogin = (u: User, loginMethod: LoginMethod = 'email') => {
    login(u, loginMethod);
    navigate("/");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleJoinGroup = (code: string, password: string) => {
    const result = joinGroup(code, password);
    if (result.success) showToast(t('joinedGroup'));
    return result;
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    updateUser(updates);
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
                onMarkNotificationsRead={markNotificationsRead}
                onMarkSingleNotificationRead={markSingleNotificationRead}
                onLogout={handleLogout}
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
                leaveList={leaveList}
                deleteList={deleteList}
                showToast={showToast}
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
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
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
      <Toast msg={toast} />
    </>
  );
}
