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
// פונקציה יחידה ומרכזית לכל "לפני כמה זמן" באפליקציה - תומכת גם בעבר וגם
// בעתיד (למשל תחזית קנייה הבאה), כולל אתמול/מחר ושבועות/חודשים. נבנתה
// מאיחוד 6 מימושים כפולים שנוצרו בטעות במקומות שונים באפליקציה.
type RelativeTimeStrings = {
  now: string;
  minsAgo: (n: number) => string; inMins: (n: number) => string;
  hoursAgo: (n: number) => string; inHours: (n: number) => string;
  yesterday: string; tomorrow: string;
  daysAgo: (n: number) => string; inDays: (n: number) => string;
  weeksAgo: (n: number) => string; inWeeks: (n: number) => string;
  monthsAgo: (n: number) => string; inMonths: (n: number) => string;
};

const RELATIVE_TIME_STRINGS: Record<Language, RelativeTimeStrings> = {
  he: {
    now: 'עכשיו',
    minsAgo: (n) => `לפני ${n} דק'`, inMins: (n) => `בעוד ${n} דק'`,
    hoursAgo: (n) => `לפני ${n} שע'`, inHours: (n) => `בעוד ${n} שע'`,
    yesterday: 'אתמול', tomorrow: 'מחר',
    daysAgo: (n) => `לפני ${n} ימים`, inDays: (n) => `בעוד ${n} ימים`,
    weeksAgo: (n) => n === 1 ? 'לפני שבוע' : `לפני ${n} שבועות`,
    inWeeks: (n) => n === 1 ? 'בעוד שבוע' : `בעוד ${n} שבועות`,
    monthsAgo: (n) => n === 1 ? 'לפני חודש' : `לפני ${n} חודשים`,
    inMonths: (n) => n === 1 ? 'בעוד חודש' : `בעוד ${n} חודשים`,
  },
  en: {
    now: 'now',
    minsAgo: (n) => `${n}m ago`, inMins: (n) => `in ${n}m`,
    hoursAgo: (n) => `${n}h ago`, inHours: (n) => `in ${n}h`,
    yesterday: 'yesterday', tomorrow: 'tomorrow',
    daysAgo: (n) => `${n}d ago`, inDays: (n) => `in ${n}d`,
    weeksAgo: (n) => `${n}w ago`, inWeeks: (n) => `in ${n}w`,
    monthsAgo: (n) => `${n}mo ago`, inMonths: (n) => `in ${n}mo`,
  },
  ru: {
    now: 'сейчас',
    minsAgo: (n) => `${n} мин назад`, inMins: (n) => `через ${n} мин`,
    hoursAgo: (n) => `${n} ч назад`, inHours: (n) => `через ${n} ч`,
    yesterday: 'вчера', tomorrow: 'завтра',
    daysAgo: (n) => `${n} дн назад`, inDays: (n) => `через ${n} дн`,
    weeksAgo: (n) => `${n} нед назад`, inWeeks: (n) => `через ${n} нед`,
    monthsAgo: (n) => `${n} мес назад`, inMonths: (n) => `через ${n} мес`,
  },
};

export const getRelativeTime = (timestamp: string, language: Language): string => {
  const now = Date.now();
  const target = new Date(timestamp).getTime();
  const diffMs = target - now;
  const isFuture = diffMs > 0;
  const absMs = Math.abs(diffMs);

  const mins = Math.floor(absMs / 60_000);
  const hours = Math.floor(absMs / 3_600_000);
  const days = Math.floor(absMs / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  const s = RELATIVE_TIME_STRINGS[language] || RELATIVE_TIME_STRINGS.en;

  if (mins < 1) return s.now;
  if (mins < 60) return isFuture ? s.inMins(mins) : s.minsAgo(mins);
  if (hours < 24) return isFuture ? s.inHours(hours) : s.hoursAgo(hours);
  if (days === 1) return isFuture ? s.tomorrow : s.yesterday;
  if (days < 7) return isFuture ? s.inDays(days) : s.daysAgo(days);
  if (days < 30) return isFuture ? s.inWeeks(weeks) : s.weeksAgo(weeks);
  if (days < 365) return isFuture ? s.inMonths(months) : s.monthsAgo(months);
  return formatDateShort(timestamp, language);
};

// ===== בדיקות תאריך =====
const todayStr = () => new Date().toISOString().split('T')[0];

export const isToday = (dateStr: string): boolean => dateStr === todayStr();

export const isActiveToday = (timestamp?: string): boolean =>
  !!timestamp && timestamp.startsWith(todayStr());

export const isActiveThisMonth = (timestamp?: string): boolean => {
  if (!timestamp) return false;
  const now = new Date();
  return new Date(timestamp) >= new Date(now.getFullYear(), now.getMonth(), 1);
};
