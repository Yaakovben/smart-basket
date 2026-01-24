import type { ProductCategory, ToastType } from '../types';

export const categoryIcons: Record<ProductCategory, string> = {
  'מוצרי חלב': '🧀',
  'מאפים': '🍞',
  'ירקות': '🥬',
  'פירות': '🍎',
  'בשר': '🥩',
  'משקאות': '☕',
  'ניקיון': '🧹',
  'אחר': '📦'
};

export const memberColors = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];

export const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅'];

export const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '👫', '🏠', '💑', '👨‍👩‍👧'];

export const COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

export const ACTIONS_WIDTH = 200;

export const toastConfig: Record<ToastType, { icon: string; bg: string; shadow: string }> = {
  success: { icon: '✓', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
  error: { icon: '✕', bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { icon: 'ℹ', bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', shadow: 'rgba(20, 184, 166, 0.3)' },
  warning: { icon: '⚠', bg: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245, 158, 11, 0.3)' }
};
