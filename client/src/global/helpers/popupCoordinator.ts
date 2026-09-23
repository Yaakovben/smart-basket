/**
 * popupCoordinator — תיאום בין popups שמופיעים אוטומטית (לא יוזמה של משתמש).
 *
 * עדיפויות (מהגבוה לנמוך):
 *  1. daily-faith         (התחזקות יומית) - תמיד ראשון אם זמין
 *  2. maintenance-apology (התנצלות חד-פעמית על ניתוק כפוי עקב עבודות
 *                         תשתית) - 3 שניות השהיה, לפני welcome-pro
 *  3. welcome-pro         (קיבלת/הופעל לך Pro) - מידע חשוב על המנוי, אבל
 *                         מוצג רק אחרי השהיה (ראו router/index.tsx) כדי
 *                         לא להקפיץ מיד בכניסה
 *  4. pwa-install         (הזמנה להתקנה) - רק בדפדפן
 *  5. push-notify         (בקשת הרשאה להתראות) - רק ב-PWA מותקן
 *  6. feedback            (מה דעתך על האפליקציה, דירוג + טקסט) - אחרי 5+
 *                         פתיחות, פעם אחת לכל משתמש (לצמיתות, לא רק לסשן)
 *
 * חוקים:
 *  - פופאפ אחד לסשן בלבד (sessionStorage, מתאפס בסגירת הדפדפן)
 *  - אין בעיה שפופאפ אחד יוצג ופופאפ אחר יוצג אחר כך באותו יום, כל עוד זה סשן חדש
 *  - כל popup שומר דחייה משלו ב-localStorage (לצמיתות)
 */

type PopupKind = 'daily-faith' | 'maintenance-apology' | 'welcome-pro' | 'pwa-install' | 'push-notify' | 'feature-tip' | 'feedback';

const SESSION_KEY = 'sb_popup_shown_session';

// האם כבר הוצג popup כלשהו בסשן הנוכחי של הדפדפן?
const wasAnyPopupShownThisSession = (): boolean => {
  try {
    return !!sessionStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
};

// רישום שה-popup הוצג (לחסום את הבאים באותו סשן)
export const markPopupShown = (kind: PopupKind): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, kind);
  } catch {
    // התעלמות - sessionStorage חסום/מלא
  }
};

// בדיקה אם מותר לפופאפ משני (PWA/push) להופיע עכשיו
// חוק יחיד: רק אם לא הוצג popup כלשהו בסשן הנוכחי.
export const canShowSecondaryPopup = (): boolean => {
  return !wasAnyPopupShownThisSession();
};
