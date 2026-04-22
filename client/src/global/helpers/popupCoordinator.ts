/**
 * popupCoordinator — תיאום בין popups שמופיעים אוטומטית (לא יוזמה של משתמש).
 *
 * עדיפויות (מהגבוה לנמוך):
 *  1. daily-faith  (התחזקות יומית) - תמיד ראשון אם זמין
 *  2. pwa-install  (הזמנה להתקנה) - רק בדפדפן
 *  3. push-notify  (בקשת הרשאה להתראות) - רק ב-PWA מותקן
 *
 * חוקים:
 *  - פופאפ אחד לסשן בלבד (sessionStorage, מתאפס בסגירת הדפדפן)
 *  - אין בעיה שפופאפ אחד יוצג ופופאפ אחר יוצג אחר כך באותו יום, כל עוד זה סשן חדש
 *  - כל popup שומר דחייה משלו ב-localStorage (לצמיתות)
 */

type PopupKind = 'daily-faith' | 'pwa-install' | 'push-notify';

const SESSION_KEY = 'sb_popup_shown_session';

// האם כבר הוצג popup כלשהו בסשן הנוכחי של הדפדפן?
export const wasAnyPopupShownThisSession = (): boolean => {
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
