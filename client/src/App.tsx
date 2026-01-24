import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

// Global imports
import type { User, List } from "./global/types";
import { Toast } from "./global/components";
import {
  validateJoinGroup,
  addMemberToList,
  removeMemberFromList,
  markListNotificationsRead
} from "./global/helpers";

// Feature imports
import {
  LoginScreen,
  HomeScreen,
  ListScreen,
  ProfileScreen,
  SettingsScreen,
} from "./features";

// Main App Content Component with Router Navigation
function AppContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("sb_current_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [lists, setLists] = useState<List[]>(() => {
    const saved = localStorage.getItem("sb_lists");
    return saved ? JSON.parse(saved) : [];
  });
  const [toast, setToast] = useState("");
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1200);
  };

  useEffect(() => {
    localStorage.setItem("sb_lists", JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("sb_current_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("sb_current_user");
    }
  }, [user]);

  const handleJoinGroup = (code: string, password: string) => {
    const validation = validateJoinGroup(lists, code, password, user);
    if (!validation.success) return validation;

    const group = lists.find((l: List) => l.inviteCode === code && l.isGroup);
    if (!group || !user) return { success: false, error: "שגיאה" };

    setLists(lists.map((l: List) => l.id === group.id ? addMemberToList(l, user) : l));
    showToast("הצטרפת לקבוצה!");
    return { success: true };
  };

  const handleLeaveList = (listId: string) => {
    if (!user) return;
    setLists(lists.map((l: List) => l.id === listId ? removeMemberFromList(l, user) : l));
    showToast("עזבת");
  };

  const markNotificationsRead = (listId: string) => {
    setLists(lists.map((l: List) => l.id === listId ? markListNotificationsRead(l) : l));
  };

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const newUser = { ...user, ...updatedUser };
    setUser(newUser);
    const users = JSON.parse(localStorage.getItem("sb_users") || "[]");
    const updatedUsers = users.map((u: User) =>
      u.id === newUser.id ? { ...u, ...updatedUser } : u,
    );
    localStorage.setItem("sb_users", JSON.stringify(updatedUsers));
    showToast("הפרופיל עודכן");
  };

  const handleLogin = (u: User) => {
    setUser(u);
    navigate("/");
  };

  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };

  const handleSelectList = (list: List) => {
    navigate(`/list/${list.id}`);
  };

  // List Screen Wrapper with URL params
  const ListScreenWrapper = () => {
    const { listId } = useParams();
    const list = lists.find((l) => l.id === listId);
    if (!list) return <Navigate to="/" replace />;
    return (
      <ListScreen
        list={list}
        user={user!}
        onBack={() => navigate("/")}
        onUpdateList={(u: List) => {
          setLists(lists.map((l: List) => (l.id === u.id ? u : l)));
        }}
        onLeaveList={(id: string) => {
          handleLeaveList(id);
          navigate("/");
        }}
        onDeleteList={(id: string) => {
          setLists(lists.filter((l: List) => l.id !== id));
          showToast("נמחק!");
          navigate("/");
        }}
        showToast={showToast}
      />
    );
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <LoginScreen onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomeScreen
                lists={lists}
                user={user!}
                onSelectList={handleSelectList}
                onCreateList={(l: List) => {
                  setLists([...lists, l]);
                  showToast("נוצר!");
                }}
                onDeleteList={(id: string) => {
                  setLists(lists.filter((l: List) => l.id !== id));
                  showToast("נמחק!");
                }}
                onEditList={(l: List) => {
                  setLists(lists.map((x: List) => (x.id === l.id ? l : x)));
                  showToast("נשמר!");
                }}
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
            <ProtectedRoute>
              <ListScreenWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileScreen
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
            <ProtectedRoute>
              <SettingsScreen />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast msg={toast} />
    </>
  );
}

// Main App with Router
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
