import type { ProductCategory, ToastType } from '../types';

// ===== Category Icons =====
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

// ===== UI Constants =====
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

// ===== Toast Config =====
export const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; shadow: string }> = {
  success: { icon: '✓', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
  error: { icon: '✕', bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { icon: 'ℹ', bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', shadow: 'rgba(20, 184, 166, 0.3)' },
  warning: { icon: '⚠', bg: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245, 158, 11, 0.3)' }
};
