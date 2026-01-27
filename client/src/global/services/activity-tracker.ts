import type { User, LoginActivity, LoginMethod } from '../types';

const STORAGE_KEY = 'sb_login_activity';
const MAX_ENTRIES = 1000;

export const ActivityTracker = {
  trackLogin: (user: User, loginMethod: LoginMethod): void => {
    const activities = ActivityTracker.getActivities();

    const newActivity: LoginActivity = {
      id: `la_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      loginMethod
    };

    activities.push(newActivity);

    // Keep only last MAX_ENTRIES to prevent localStorage bloat
    const trimmedActivities = activities.slice(-MAX_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedActivities));
  },

  getActivities: (): LoginActivity[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  clearActivities: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
