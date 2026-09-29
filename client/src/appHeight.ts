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

  const set = () => {
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    const layoutH = window.innerHeight || d.clientHeight;
    // אין שדה בפוקוס אבל האזור הנראה עדיין קטן בגובה של מקלדת: המקלדת
    // באמצע סגירה (ב-iOS אירוע ה-resize נורה לפעמים לפני סוף האנימציה ולא
    // שוב אחריה). בלי זה הגובה ננעל על "מסך פחות מקלדת", וכל העמוד נחתך
    // באמצע, למשל בדף המנהל אחרי חיפוש לקוח. סרגלי דפדפן קטנים בהרבה.
    const keyboardGap = vv && vv.scale <= 1.01 && layoutH - vv.height > KEYBOARD_MIN_PX;
    const visible = keyboardGap ? layoutH : (vv?.height || layoutH);
    if (visible > 0) d.style.setProperty('--app-height', Math.round(visible) + 'px');
    if (vv) {
      const nb = keyboardGap ? 0 : Math.max(0, Math.round(layoutH - vv.height - vv.offsetTop));
      d.style.setProperty('--nav-bottom', nb + 'px');
    }
  };

  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; set(); });
  };

  set();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => setTimeout(set, 300));
  window.addEventListener('load', set);
  // יציאה משדה: מודדים שוב אחרי שאנימציית סגירת המקלדת הסתיימה
  document.addEventListener('focusout', () => {
    for (const delay of [60, 350, 800]) setTimeout(set, delay);
  });
  if (vv) {
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
  }
})();
