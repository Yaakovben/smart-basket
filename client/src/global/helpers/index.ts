import type { ProductCategory } from '../types';

// ===== Haptic Feedback =====
export const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[style]);
  }
};

// ===== Email Validation =====
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ===== Password Strength =====
export const getPasswordStrength = (password: string) => {
  if (password.length === 0) return { strength: 0, text: '', color: '' };
  if (password.length < 4) return { strength: 1, text: 'חלשה', color: '#EF4444' };
  if (password.length < 6) return { strength: 2, text: 'בינונית', color: '#F59E0B' };
  return { strength: 3, text: 'חזקה', color: '#10B981' };
};

// ===== Code Generation =====
export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePassword = (): string => {
  return Math.random().toString(36).substring(2, 6);
};

// ===== Date/Time Formatting =====
export const formatDate = (date = new Date()): string => {
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatTime = (date = new Date()): string => {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

// ===== Constants =====
export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  'מוצרי חלב': '🧀',
  'מאפים': '🍞',
  'ירקות': '🥬',
  'פירות': '🍎',
  'בשר': '🥩',
  'משקאות': '☕',
  'ניקיון': '🧹',
  'אחר': '📦'
};

export const MEMBER_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];
export const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅'];
export const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '👫', '🏠', '💑', '👨‍👩‍👧'];
export const LIST_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
export const SWIPE_ACTIONS_WIDTH = 200;

// ===== Storage Keys =====
export const STORAGE_KEYS = {
  USERS: 'sb_users',
  CURRENT_USER: 'sb_current_user',
  LISTS: 'sb_lists',
  HINT_SEEN: 'sb_hint_seen'
} as const;
