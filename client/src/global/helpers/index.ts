// ===== רטט מישוש (משותף לכל הפיצ'רים) =====
// עובד רק על Android. ב iOS Safari אין תמיכה ב Vibration API באפליקציות PWA.
export const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  // רטט מקורי (Android בלבד)
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(patterns[style]);
  }
};

// ייצוא חוזר של קבועים
export {
  CATEGORY_ICONS,
  CATEGORY_TRANSLATION_KEYS,
  MEMBER_COLORS,
  LIST_ICONS,
  GROUP_ICONS,
  LIST_COLORS,
  SWIPE_ACTIONS_WIDTH,
  STORAGE_KEYS,
  MENU_OPTIONS,
  DEFAULT_SETTINGS,
  LANGUAGES,
  SIZES,
  COMMON_STYLES,
  BRAND_COLORS,
  SWIPE_CONFIG
} from '../constants';

// פעולות רשימה
export {
  generateInviteMessage,
  generateShareListMessage
} from './listOperations';

// עיצוב תאריכים
export {
  getLocale,
  formatDateLong,
  formatDateShort,
  formatTimeShort,
  getRelativeTime,
  isToday,
  isYesterday,
  isActiveToday,
  isActiveThisWeek
} from './dateFormatting';
