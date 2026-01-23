import type { ProductCategory } from '../types';

// Haptic feedback
export const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[type]);
  }
};

// Category Icons
export const categoryIcons: Record<ProductCategory, string> = {
  'מוצרי חלב': '🥛',
  'מאפים': '🍞',
  'ירקות': '🥬',
  'פירות': '🍎',
  'בשר': '🥩',
  'משקאות': '🥤',
  'ניקיון': '🧹',
  'אחר': '📦'
};

// List Icons
export const listIcons = ['🛒', '🏠', '🎉', '🎂', '🏢', '✈️', '🎁', '📚'];
export const listColors = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6366F1'];

// Email validation
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Password strength
export const getPasswordStrength = (pwd: string) => {
  if (pwd.length === 0) return { strength: 0, text: '', color: '' };
  if (pwd.length < 4) return { strength: 1, text: 'חלשה', color: '#EF4444' };
  if (pwd.length < 6) return { strength: 2, text: 'בינונית', color: '#F59E0B' };
  return { strength: 3, text: 'חזקה', color: '#10B981' };
};

// Generate random code
export const generateCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate random password
export const generatePassword = (): string => {
  return Math.random().toString(36).substring(2, 6);
};

// Format date
export const formatDate = (): string => {
  return new Date().toLocaleDateString('he-IL');
};

// Format time
export const formatTime = (): string => {
  return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};
