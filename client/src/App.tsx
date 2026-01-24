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
import type { User, List, Member, Notification } from "./global/types";
import { Toast } from "./global/components";

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
    if (!user) return { success: false, error: "משתמש לא מחובר" };
    const group = lists.find((l: List) => l.inviteCode === code && l.isGroup);
    if (!group) return { success: false, error: "קבוצה לא נמצאה" };
    if (group.password !== password)
      return { success: false, error: "סיסמה שגויה" };
    if (
      group.owner.id === user.id ||
      group.members.some((m: Member) => m.id === user.id)
    ) {
      return { success: false, error: "אתה כבר בקבוצה" };
    }
    const updatedLists = lists.map((l: List) =>
      l.id === group.id
        ? {
            ...l,
            members: [
              ...l.members,
              { id: user.id, name: user.name, email: user.email },
            ],
            notifications: [
              ...(l.notifications || []),
              {
                id: `n${Date.now()}`,
                type: "join" as const,
                userId: user.id,
                userName: user.name,
                timestamp: new Date().toISOString(),
                read: false,
              },
            ],
          }
        : l,
    );
    setLists(updatedLists);
    showToast("הצטרפת לקבוצה!");
    return { success: true };
  };

  const handleLeaveList = (listId: string) => {
    if (!user) return;
    setLists(
      lists.map((l: List) =>
        l.id === listId
          ? {
              ...l,
              members: l.members.filter((m: Member) => m.id !== user.id),
              notifications: [
                ...(l.notifications || []),
                {
                  id: `n${Date.now()}`,
                  type: "leave" as const,
                  userId: user.id,
                  userName: user.name,
                  timestamp: new Date().toISOString(),
                  read: false,
                },
              ],
            }
          : l,
      ),
    );
    showToast("עזבת");
  };

  const markNotificationsRead = (listId: string) => {
    setLists(
      lists.map((l: List) =>
        l.id === listId
          ? {
              ...l,
              notifications: (l.notifications || []).map((n: Notification) => ({
                ...n,
                read: true,
              })),
            }
          : l,
      ),
    );
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
        onUpdateList={(u) => {
          setLists(lists.map((l) => (l.id === u.id ? u : l)));
        }}
        onLeaveList={(id) => {
          handleLeaveList(id);
          navigate("/");
        }}
        onDeleteList={(id) => {
          setLists(lists.filter((l) => l.id !== id));
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
                onCreateList={(l) => {
                  setLists([...lists, l]);
                  showToast("נוצר!");
                }}
                onDeleteList={(id) => {
                  setLists(lists.filter((l) => l.id !== id));
                  showToast("נמחק!");
                }}
                onEditList={(l) => {
                  setLists(lists.map((x) => (x.id === l.id ? l : x)));
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
