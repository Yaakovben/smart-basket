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
  const vv = window.visualViewport;
  let raf = 0;

  const set = () => {
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    const visible = vv?.height || window.innerHeight || d.clientHeight;
    if (visible > 0) d.style.setProperty('--app-height', Math.round(visible) + 'px');
    if (vv) {
      const layoutH = window.innerHeight || d.clientHeight;
      const nb = Math.max(0, Math.round(layoutH - vv.height - vv.offsetTop));
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
  if (vv) {
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
  }
})();
