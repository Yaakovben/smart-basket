// ===== רטט מישוש (משותף לכל הפיצ'רים) =====
// עובד רק על Android. ב iOS Safari אין תמיכה ב Vibration API באפליקציות PWA.
//
// מדיניות מכוונת: רוב הקריאות באפליקציה הן haptic('light') על *כל* טאץ'
// (החלפת טאב, פתיחת/סגירת סקשן, לחיצה על צ'יפ). זה נתפס כ"רוטט בכל פעולה".
// לכן 'light' הושתק כברירת מחדל - רטט קורה רק על פעולות שבאמת *קורה בהן משהו*:
// 'medium' (הוספה/שמירה/בחירה) ו-'heavy' (מחיקה/שגיאה/חגיגה/לחיצה ארוכה).
// throttle של 120ms מונע "סדרת רטטים" ברצף פעולות (למשל בחירה מרובה).
// prefers-reduced-motion מכבה לגמרי.
let _lastHapticAt = 0;

export const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (style === 'light') return; // מושתק בכוונה - ראו הערה למעלה
  if (!('vibrate' in navigator)) return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  } catch { /* matchMedia לא זמין - ממשיכים */ }

  const now = Date.now();
  if (now - _lastHapticAt < 120) return;
  _lastHapticAt = now;

  navigator.vibrate(style === 'heavy' ? 28 : 14);
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

// יומן אבחון ששורד קריסה - לחקירת "האפליקציה נסגרת לבד" ב-iOS PWA.
// rotateCrashLog/startHeartbeat רצים אוטומטית ב-import של המודול (ראו
// crashLog.ts) ולכן לא מיוצאים - רק ה-API שצריך שימוש חיצוני.
export { diagLog, getSessionHistory, clearSessionHistory } from './crashLog';

// הופך **טקסט** גולמי מתשובות ה-AI למודגש בפועל - משותף בין הצ'אט לניתוח רשימה
export { renderInlineBold } from './renderInlineBold';
