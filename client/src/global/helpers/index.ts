// ===== רטט מישוש (משותף לכל הפיצ'רים) =====
// שלושה מסלולים:
//  1. אפליקציה נייטיב (App Store / Google Play): מנוע ה-haptics של המערכת
//     (@capacitor/haptics). זה המסלול היחיד שנותן רטט אמיתי באייפון.
//  2. אנדרואיד בדפדפן: Vibration API.
//  3. אייפון בדפדפן: אין Vibration API. מ-iOS 18 לחיצה על מתג מערכת
//     (<input type="checkbox" switch>) משמיעה רטט קל, וזה מה שמשתמשים בו.
//
// מדיניות מכוונת: רוב הקריאות באפליקציה הן haptic('light') על *כל* טאץ'
// (החלפת טאב, פתיחת/סגירת סקשן, לחיצה על צ'יפ). זה נתפס כ"רוטט בכל פעולה".
// לכן 'light' הושתק כברירת מחדל - רטט קורה רק על פעולות שבאמת *קורה בהן משהו*:
// 'medium' (הוספה/שמירה/בחירה), 'heavy' (מחיקה/שגיאה/חגיגה/לחיצה ארוכה)
// ו-'success' (זיהוי ברקוד, פעולה שהושלמה).
// throttle של 120ms מונע "סדרת רטטים" ברצף פעולות (למשל בחירה מרובה).
// prefers-reduced-motion מכבה לגמרי.
let _lastHapticAt = 0;

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success';

const isIOSWeb = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// רטט המערכת של iOS 18 ומעלה דרך מתג (ראו מסלול 3). בגרסאות ישנות - בלי השפעה
const iosSwitchTap = () => {
  try {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    label.style.display = 'none';
    document.body.appendChild(label);
    label.click();
    label.remove();
  } catch { /* DOM לא זמין */ }
};

// האפליקציה הנייטיב מזריקה את window.Capacitor. בודקים דרכו ולא מייבאים את
// @capacitor/core, כדי לא להוסיף משקל לטעינת האפליקציה בדפדפן
const isNativeShell = (): boolean =>
  !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

const nativeHaptic = async (style: Exclude<HapticStyle, 'light'>) => {
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
  if (style === 'success') await Haptics.notification({ type: NotificationType.Success });
  else await Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium });
};

export const haptic = (style: HapticStyle = 'light') => {
  if (style === 'light') return; // מושתק בכוונה - ראו הערה למעלה
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  } catch { /* matchMedia לא זמין - ממשיכים */ }

  const now = Date.now();
  if (now - _lastHapticAt < 120) return;
  _lastHapticAt = now;

  if (isNativeShell()) {
    // גרסת אפליקציה שנבנתה לפני הוספת הפלאגין: נופלים לרטט של הדפדפן
    nativeHaptic(style).catch(() => {
      if ('vibrate' in navigator) navigator.vibrate(style === 'heavy' ? 28 : 14);
    });
    return;
  }
  if ('vibrate' in navigator) {
    // הצלחה: שני פולסים קצרים, מורגש ושונה מלחיצה רגילה
    navigator.vibrate(style === 'success' ? [18, 60, 26] : style === 'heavy' ? 28 : 14);
    return;
  }
  if (isIOSWeb()) {
    iosSwitchTap();
    if (style === 'success') window.setTimeout(iosSwitchTap, 90);
  }
};

// ניקוי התראות של רשימה מסוימת שנכנסים אליה - גם ב-DB/state (markAllAsRead,
// ראו useNotifications.ts) וגם ב-service worker (סוגר כל push ממתין לרשימה
// הזו, ראו sw.ts). משותף בין שתי נקודות כניסה (כרטיס רשימה בבית, שורת
// התראה בפעמון) כדי שלא יהיו שני עותקים כמעט-זהים שעלולים להתפצל בהמשך.
// navigator.serviceWorker.ready (לא .controller) - .controller יכול
// להיות null רגע אחרי טעינה ראשונה/החלפת SW, לפני שהוא "תפס" את הדף;
// .ready ממתין לאותו SW פעיל בפועל ולא מפספס את ההודעה במקרה הזה.
export function clearListNotifications(listId: string, markAllAsRead?: (listId?: string) => void) {
  markAllAsRead?.(listId);
  navigator.serviceWorker?.ready.then(registration => {
    registration.active?.postMessage({ type: 'CLEAR_LIST_NOTIFICATIONS', listId });
  });
}

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
  getReorderEntrySx,
  BRAND_COLORS,
  SWIPE_CONFIG
} from '../constants';

// פעולות רשימה
export {
  generateInviteMessage,
  generateShareListMessage
} from './listOperations';

// עיצוב מחיר (₪)
export { formatILS } from './currencyFormatting';

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

// מונה "פתיחות אפליקציה" אמיתיות - לתנאי כניסה של פופאפ המשוב (20+ פתיחות)
export { getAppOpenCount, countAppOpen } from './appOpenCount';

// יומן אבחון ששורד קריסה - לחקירת "האפליקציה נסגרת לבד" ב-iOS PWA.
// rotateCrashLog/startHeartbeat רצים אוטומטית ב-import של המודול (ראו
// crashLog.ts) ולכן לא מיוצאים - רק ה-API שצריך שימוש חיצוני.
export { diagLog, getSessionHistory, clearSessionHistory } from './crashLog';

// הופך **טקסט** גולמי מתשובות ה-AI למודגש בפועל - משותף בין הצ'אט לניתוח רשימה
export { renderInlineBold } from './renderInlineBold';
