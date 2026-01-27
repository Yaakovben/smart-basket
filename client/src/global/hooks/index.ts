import { useState, useCallback } from 'react';
import type { User, List, Member, Notification, LoginMethod } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ActivityTracker } from '../services';

// ===== useLocalStorage Hook =====
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(valueToStore));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}

// ===== useToast Hook =====
export function useToast(duration = 1200) {
  const [message, setMessage] = useState('');

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  }, [duration]);

  return { message, showToast };
}

// ===== useAuth Hook =====
export function useAuth() {
  const [user, setUser] = useLocalStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);

  const login = useCallback((userData: User, loginMethod: LoginMethod = 'email') => {
    setUser(userData);
    // Track login activity for admin dashboard
    ActivityTracker.trackLogin(userData, loginMethod);
  }, [setUser]);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    // Update in users list
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const updatedUsers = users.map((u: User) => u.id === user.id ? { ...u, ...updates } : u);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  }, [user, setUser]);

  return { user, login, logout, updateUser, isAuthenticated: !!user };
}

// ===== useLists Hook =====
export function useLists(user: User | null) {
  const [lists, setLists] = useLocalStorage<List[]>(STORAGE_KEYS.LISTS, []);

  const createList = useCallback((list: List) => {
    setLists(prev => [...prev, list]);
  }, [setLists]);

  const updateList = useCallback((updatedList: List) => {
    setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
  }, [setLists]);

  const deleteList = useCallback((listId: string) => {
    setLists(prev => prev.filter(l => l.id !== listId));
  }, [setLists]);

  const joinGroup = useCallback((code: string, password: string): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: 'משתמש לא מחובר' };

    const group = lists.find(l => l.inviteCode === code && l.isGroup);
    if (!group) return { success: false, error: 'קבוצה לא נמצאה' };
    if (group.password !== password) return { success: false, error: 'סיסמה שגויה' };
    if (group.owner.id === user.id || group.members.some(m => m.id === user.id)) {
      return { success: false, error: 'אתה כבר בקבוצה' };
    }

    const notification: Notification = {
      id: `n${Date.now()}`,
      type: 'join',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      read: false
    };

    setLists(prev => prev.map(l => l.id === group.id ? {
      ...l,
      members: [...l.members, { id: user.id, name: user.name, email: user.email }],
      notifications: [...(l.notifications || []), notification]
    } : l));

    return { success: true };
  }, [user, lists, setLists]);

  const leaveList = useCallback((listId: string) => {
    if (!user) return;

    const notification: Notification = {
      id: `n${Date.now()}`,
      type: 'leave',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      read: false
    };

    setLists(prev => prev.map(l => l.id === listId ? {
      ...l,
      members: l.members.filter((m: Member) => m.id !== user.id),
      notifications: [...(l.notifications || []), notification]
    } : l));
  }, [user, setLists]);

  const markNotificationsRead = useCallback((listId: string) => {
    setLists(prev => prev.map(l => l.id === listId ? {
      ...l,
      notifications: (l.notifications || []).map(n => ({ ...n, read: true }))
    } : l));
  }, [setLists]);

  return {
    lists,
    createList,
    updateList,
    deleteList,
    joinGroup,
    leaveList,
    markNotificationsRead
  };
}
