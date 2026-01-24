import type { User, List } from '../types';

export const STORAGE_KEYS = {
  CURRENT_USER: 'sb_current_user',
  USERS: 'sb_users',
  LISTS: 'sb_lists',
  HINT_SEEN: 'sb_hint_seen',
} as const;

export const StorageService = {
  // User operations
  getCurrentUser: (): User | null => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
  },

  setCurrentUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  removeCurrentUser: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getUsers: (): User[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : [];
  },

  setUsers: (users: User[]): void => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // List operations
  getLists: (): List[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.LISTS);
    return saved ? JSON.parse(saved) : [];
  },

  setLists: (lists: List[]): void => {
    localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
  },

  // Hint operations
  isHintSeen: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.HINT_SEEN) === 'true';
  },

  markHintSeen: (): void => {
    localStorage.setItem(STORAGE_KEYS.HINT_SEEN, 'true');
  },

  // Clear all data
  clearAll: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};
