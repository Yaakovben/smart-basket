// ===== Haptic Feedback (shared across all features) =====
// Note: Only works on Android. iOS Safari doesn't support Vibration API in PWAs.
export const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  // Try native vibration (Android only)
  if ('vibrate' in navigator) {
    const patterns = { light: 25, medium: 50, heavy: 100 };
    navigator.vibrate(patterns[style]);
  }
};

// Re-export constants for backward compatibility
export {
  CATEGORY_ICONS,
  MEMBER_COLORS,
  LIST_ICONS,
  GROUP_ICONS,
  LIST_COLORS,
  SWIPE_ACTIONS_WIDTH,
  STORAGE_KEYS,
  TOAST_CONFIG,
  MENU_OPTIONS,
  DEFAULT_SETTINGS,
  LANGUAGES,
  SIZES,
  COMMON_STYLES,
  BRAND_COLORS,
  SWIPE_CONFIG
} from '../constants';

// List operations helpers
export {
  generateInviteMessage,
  generateShareListMessage
} from './listOperations';

// Date formatting utilities
export {
  formatDateLong,
  formatDateShort,
  formatTimeShort,
  getRelativeTime,
  isToday,
  isYesterday,
  isActiveToday,
  isActiveThisWeek
} from './dateFormatting';
