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
  CATEGORY_COLORS,
  MEMBER_COLORS,
  LIST_ICONS,
  GROUP_ICONS,
  LIST_COLORS,
  SWIPE_ACTIONS_WIDTH,
  MENU_OPTIONS,
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
  formatDateShort,
  formatTimeShort,
  getRelativeTime,
  isToday,
  isActiveToday,
  isActiveThisMonth
} from './dateFormatting';

// תיאום popups אוטומטיים (daily-faith / pwa-install / push-notify)
export {
  canShowSecondaryPopup,
  markPopupShown,
} from './popupCoordinator';

// localStorage בטוח — try/catch פנימי, API קריא יותר (גם עם JSON)
export { safeStorage } from './safeStorage';

// יומן אבחון ששורד קריסה - לחקירת "האפליקציה נסגרת לבד" ב-iOS PWA
export { diagLog, rotateCrashLog, startHeartbeat, getPreviousSessionLog, clearPreviousSessionLog } from './crashLog';
