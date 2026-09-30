/**
 * appHeight — קובע שני CSS variables על <html>:
 *   --app-height  = גובה האזור הנראה בפועל (visualViewport.height). 100dvh/
 *                   100vh מחושבים לא נכון ב-iOS והמסך יוצא חתוך מלמטה.
 *   --nav-bottom  = גובה סרגל הדפדפן התחתון. ברי ניווט (position:fixed)
 *                   יושבים ב-bottom: var(--nav-bottom) כדי לא להיחתך מאחוריו.
 *
 * רץ מ-main.tsx (לא מ-<head> של index.html) - כדי ש-index.html יישאר זהה
 * לפרודקשן, בלי שום סקריפט שרץ בזמן מסך הטעינה. ה-CSS משתמש ב-fallback
 * (100%/100dvh/0px) עד שהמודול הזה רץ, אז אין הבדל בפועל.
 */
(function () {
  if (typeof window === 'undefined') return;
  const d = document.documentElement;
  // הפרש גובה שמעליו מדובר במקלדת ולא בסרגל כלים של הדפדפן
  const KEYBOARD_MIN_PX = 150;
  const vv = window.visualViewport;
  let raf = 0;
  // הגובה הנראה הגדול ביותר שנמדד בלי מקלדת, לכל כיוון מסך בנפרד. באייפון
  // גם innerHeight קטן כשהמקלדת פתוחה, ולכן ההשוואה אליו לבדה לא מזהה מקלדת
  // שבאמצע סגירה, והגובה היה ננעל על "מסך פחות מקלדת": כל התחתית קפצה
  // לאמצע המסך עם שטח ריק מתחתיה.
  let fullH = 0;
  // ההשוואה לגובה המלא רק בשניות שאחרי יציאה משדה, כשהמקלדת נסגרת. בכל זמן
  // אחר ירידה בגובה היא שינוי אמיתי (חלון שהוקטן, מסך מפוצל) ולא מקלדת.
  const CLOSING_WINDOW_MS = 3000;
  let lastFocusOut = 0;
  // שדה שהוסר מהמסך בזמן שהיה בפוקוס (למשל חיפוש שנסגר לבד) לא שולח focusout,
  // ולכן מזהים גם כאן את המעבר משדה בפוקוס לבלי שדה
  let inputWasFocused = false;
  let trailing = 0;
  const orientation = () => (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  let lastOrientation = orientation();

  const set = () => {
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) { inputWasFocused = true; return; }
    if (inputWasFocused) { inputWasFocused = false; lastFocusOut = Date.now(); }
    const o = orientation();
    if (o !== lastOrientation) { fullH = 0; lastOrientation = o; }
    const layoutH = window.innerHeight || d.clientHeight;
    const vvH = vv?.height || layoutH;
    // אין שדה בפוקוס אבל האזור הנראה עדיין קטן בגובה של מקלדת: המקלדת
    // באמצע סגירה (ב-iOS אירוע ה-resize נורה לפעמים לפני סוף האנימציה ולא
    // שוב אחריה). סרגלי דפדפן קטנים בהרבה ממקלדת.
    const zoomed = !!vv && vv.scale > 1.01;
    const keyboardClosing = Date.now() - lastFocusOut < CLOSING_WINDOW_MS;
    const keyboardGap = !zoomed && (layoutH - vvH > KEYBOARD_MIN_PX
      || (keyboardClosing && fullH > 0 && fullH - vvH > KEYBOARD_MIN_PX));
    if (!keyboardGap && !zoomed) fullH = keyboardClosing ? Math.max(fullH, vvH) : vvH;
    const visible = keyboardGap ? Math.max(layoutH, fullH) : vvH;
    if (visible > 0) d.style.setProperty('--app-height', Math.round(visible) + 'px');
    if (vv) {
      const nb = keyboardGap ? 0 : Math.max(0, Math.round(layoutH - vv.height - vv.offsetTop));
      d.style.setProperty('--nav-bottom', nb + 'px');
    }
  };

  const schedule = () => {
    // מדידה נוספת אחרי שהשינויים נרגעו: האירוע האחרון נורה לפעמים לפני סוף האנימציה
    clearTimeout(trailing);
    trailing = window.setTimeout(set, 500);
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; set(); });
  };

  set();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => setTimeout(set, 300));
  window.addEventListener('load', set);
  // יציאה משדה: מודדים שוב אחרי שאנימציית סגירת המקלדת הסתיימה
  document.addEventListener('focusout', () => {
    lastFocusOut = Date.now();
    for (const delay of [60, 350, 800, 1500]) setTimeout(set, delay);
  });
  // חזרה לאפליקציה מהרקע: מקלדת שנסגרה בזמן שהאפליקציה לא הייתה גלויה
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  window.addEventListener('pageshow', schedule);
  if (vv) {
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
  }
})();
