import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import type { User, List } from "../global/types";
import { useAuth, useLists, useToast } from "../global/hooks";
import { Toast } from "../global/components";
import {
  LoginPage,
  HomePage,
  ListPage,
  ProfilePage,
  SettingsPage,
} from "../features/features";

// Protected Route wrapper
const ProtectedRoute = ({ children, user }: { children: React.ReactNode; user: User | null }) => {
  if (!user) return <Navigate to="/login" replace />;
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
        showToast("עזבת");
        navigate("/");
      }}
      onDeleteList={(id: string) => {
        deleteList(id);
        showToast("נמחק!");
        navigate("/");
      }}
      showToast={showToast}
    />
  );
};

// Main App Router
export const AppRouter = () => {
  const navigate = useNavigate();

  // Hooks for state management
  const { user, login, logout, updateUser } = useAuth();
  const { lists, createList, updateList, deleteList, joinGroup, leaveList, markNotificationsRead } = useLists(user);
  const { message: toast, showToast } = useToast();

  // Handlers
  const handleLogin = (u: User) => {
    login(u);
    navigate("/");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleJoinGroup = (code: string, password: string) => {
    const result = joinGroup(code, password);
    if (result.success) showToast("הצטרפת לקבוצה!");
    return result;
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    updateUser(updates);
    showToast("הפרופיל עודכן");
  };

  const handleCreateList = (list: List) => {
    createList(list);
    showToast("נוצר!");
  };

  const handleDeleteList = (id: string) => {
    deleteList(id);
    showToast("נמחק!");
  };

  const handleEditList = (list: List) => {
    updateList(list);
    showToast("נשמר!");
  };

  return (
    <>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast msg={toast} />
    </>
  );
}
