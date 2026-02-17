import type { Language } from '../types';

// ===== מיפוי שפה ל-locale =====
export const getLocale = (language: Language): string => {
  const locales: Record<Language, string> = {
    he: 'he-IL',
    en: 'en-US',
    ru: 'ru-RU'
  };
  return locales[language] || 'en-US';
};

// ===== עיצוב תאריכים =====
export const formatDateLong = (timestamp: string, language: Language): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(getLocale(language), {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateShort = (timestamp: string, language: Language): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(getLocale(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatTimeShort = (timestamp: string, language: Language = 'he'): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(getLocale(language), {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ===== זמן יחסי =====
export const getRelativeTime = (timestamp: string, language: Language): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const translations: Record<Language, {
    now: string;
    mins: (n: number) => string;
    hours: (n: number) => string;
    days: (n: number) => string;
  }> = {
    he: {
      now: 'עכשיו',
      mins: (n) => `לפני ${n} דק'`,
      hours: (n) => `לפני ${n} שע'`,
      days: (n) => `לפני ${n} ימים`
    },
    en: {
      now: 'now',
      mins: (n) => `${n}m ago`,
      hours: (n) => `${n}h ago`,
      days: (n) => `${n}d ago`
    },
    ru: {
      now: 'сейчас',
      mins: (n) => `${n} мин назад`,
      hours: (n) => `${n} ч назад`,
      days: (n) => `${n} дн назад`
    }
  };

  const t = translations[language] || translations.en;

  if (diffMins < 1) return t.now;
  if (diffMins < 60) return t.mins(diffMins);
  if (diffHours < 24) return t.hours(diffHours);
  if (diffDays < 7) return t.days(diffDays);
  return formatDateShort(timestamp, language);
};

// ===== בדיקות תאריך =====
export const isToday = (dateStr: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

export const isYesterday = (dateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split('T')[0];
};

export const isActiveToday = (timestamp?: string): boolean => {
  if (!timestamp) return false;
  const today = new Date().toISOString().split('T')[0];
  return timestamp.startsWith(today);
};

export const isActiveThisWeek = (timestamp?: string): boolean => {
  if (!timestamp) return false;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return new Date(timestamp) > weekAgo;
};
