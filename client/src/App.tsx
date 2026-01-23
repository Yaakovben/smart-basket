import { useState, useEffect, useCallback } from 'react';
import type { User, List, Member, Notification } from './shared/types';
import { Toast } from './shared/components';
import { LoginPage } from './features/auth/pages';
import { HomePage } from './features/home/pages';
import { ProfilePage } from './features/profile/pages';
import { SettingsPage } from './features/settings/pages';
import { StatsPage } from './features/stats/pages';
import { ListPage } from './features/list/pages';

type Screen = 'home' | 'profile' | 'settings' | 'stats' | 'list';

export default function App() {
  // User state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sb_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Lists state
  const [lists, setLists] = useState<List[]>(() => {
    const saved = localStorage.getItem('sb_lists');
    return saved ? JSON.parse(saved) : [];
  });

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedList, setSelectedList] = useState<List | null>(null);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success' as const, visible: false });

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('sb_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sb_current_user');
    }
  }, [user]);

  // Persist lists to localStorage
  useEffect(() => {
    localStorage.setItem('sb_lists', JSON.stringify(lists));
  }, [lists]);

  // Toast helper
  const showToast = useCallback((message: string) => {
    setToast({ message, type: 'success', visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }, []);

  // Auth handlers
  const handleLogin = (u: User) => {
    setUser(u);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('home');
    setSelectedList(null);
    showToast('התנתקת בהצלחה');
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);

      // Update user in users list
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      const idx = users.findIndex((u: User) => u.id === user.id);
      if (idx >= 0) {
        users[idx] = updated;
        localStorage.setItem('sb_users', JSON.stringify(users));
      }

      showToast('נשמר');
    }
  };

  // List handlers
  const handleCreateList = (list: List) => {
    setLists(prev => [...prev, list]);
    showToast('נוצר בהצלחה');
  };

  const handleUpdateList = (list: List) => {
    setLists(prev => prev.map(l => l.id === list.id ? list : l));
    if (selectedList?.id === list.id) {
      setSelectedList(list);
    }
  };

  const handleDeleteList = (listId: string) => {
    setLists(prev => prev.filter(l => l.id !== listId));
    if (selectedList?.id === listId) {
      setSelectedList(null);
      setCurrentScreen('home');
    }
    showToast('נמחק');
  };

  const handleEditList = (list: List) => {
    handleUpdateList(list);
    showToast('נשמר');
  };

  const handleLeaveList = (listId: string) => {
    if (!user) return;

    setLists(prev => prev.map(l => {
      if (l.id === listId) {
        // Add leave notification for owner
        const notification: Notification = {
          id: `n${Date.now()}`,
          type: 'leave',
          userId: user.id,
          userName: user.name,
          timestamp: new Date().toISOString(),
          read: false
        };
        return {
          ...l,
          members: l.members.filter((m: Member) => m.id !== user.id),
          notifications: [...(l.notifications || []), notification]
        };
      }
      return l;
    }));

    setSelectedList(null);
    setCurrentScreen('home');
    showToast('עזבת את הקבוצה');
  };

  const handleJoinGroup = (code: string, password: string): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: 'משתמש לא מחובר' };

    const list = lists.find(l => l.inviteCode === code);
    if (!list) return { success: false, error: 'קוד שגוי' };
    if (list.password !== password) return { success: false, error: 'סיסמה שגויה' };
    if (list.owner.id === user.id) return { success: false, error: 'אתה הבעלים של קבוצה זו' };
    if (list.members.some((m: Member) => m.id === user.id)) return { success: false, error: 'אתה כבר חבר בקבוצה' };

    // Add join notification for owner
    const notification: Notification = {
      id: `n${Date.now()}`,
      type: 'join',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      read: false
    };

    setLists(prev => prev.map(l => {
      if (l.id === list.id) {
        return {
          ...l,
          members: [...l.members, { id: user.id, name: user.name, email: user.email }],
          notifications: [...(l.notifications || []), notification]
        };
      }
      return l;
    }));

    showToast('הצטרפת בהצלחה!');
    return { success: true };
  };

  const handleMarkNotificationsRead = (listId: string) => {
    setLists(prev => prev.map(l => {
      if (l.id === listId && l.notifications) {
        return {
          ...l,
          notifications: l.notifications.map(n => ({ ...n, read: true }))
        };
      }
      return l;
    }));
  };

  const handleSelectList = (list: List) => {
    setSelectedList(list);
    setCurrentScreen('list');
  };

  const handleNavigate = (screen: 'profile' | 'settings' | 'stats') => {
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    setCurrentScreen('home');
    setSelectedList(null);
  };

  const handleDeleteAllData = () => {
    localStorage.removeItem('sb_lists');
    localStorage.removeItem('sb_users');
    localStorage.removeItem('sb_current_user');
    localStorage.removeItem('sb_hint_seen');
    setLists([]);
    setUser(null);
    showToast('כל הנתונים נמחקו');
  };

  // Show login if no user
  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toast message={toast.message} type={toast.type} visible={toast.visible} />
      </>
    );
  }

  // Main app with screens
  return (
    <>
      {currentScreen === 'home' && (
        <HomePage
          lists={lists}
          user={user}
          onSelectList={handleSelectList}
          onCreateList={handleCreateList}
          onDeleteList={handleDeleteList}
          onEditList={handleEditList}
          onJoinGroup={handleJoinGroup}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onNavigate={handleNavigate}
          showToast={showToast}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfilePage
          user={user}
          onUpdateUser={handleUpdateUser}
          onBack={handleBack}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsPage
          onBack={handleBack}
          onDeleteAllData={handleDeleteAllData}
        />
      )}

      {currentScreen === 'stats' && (
        <StatsPage onBack={handleBack} />
      )}

      {currentScreen === 'list' && selectedList && (
        <ListPage
          list={selectedList}
          user={user}
          onBack={handleBack}
          onUpdateList={handleUpdateList}
          onLeaveList={handleLeaveList}
          onDeleteList={handleDeleteList}
          showToast={showToast}
        />
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  );
}
