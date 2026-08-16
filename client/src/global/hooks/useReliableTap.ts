import { useCallback, useRef } from 'react';

// חלון הזמן שבו פעולה כפולה נחסמת — מונע הפעלה כפולה כשגם pointerup וגם click
// מגיעים מאותה לחיצה (עכבר/מגע). הפעלה במקלדת (Enter/Space) עוברת רק דרך click
// ולא דרך pointerup, ולכן תמיד עוברת כי ה-guard מתאפס בין ריאקציות.
const SAME_TAP_WINDOW_MS = 500;

/**
 * מפעיל action פעם אחת בדיוק ללחיצה.
 *
 * הגישה הסימטרית: גם onPointerUp וגם onClick בודקים את ה-guard לפני שהם יורים.
 * כך נמנעת הפעלה כפולה בכל כיוון — בין אם pointerup הגיע ראשון ובין אם click.
 *
 * onPointerUp — אמין יותר מ-onClick על חלק ממכשירי אנדרואיד (click דורש הקשה
 * כפולה לפעמים). onClick — fallback לנגישות במקלדת ולמכשירים שבהם pointerup
 * לא מגיע (למשל, iOS Safari בתוך Dialog בתנאים מסוימים).
 */
export function useReliableTap(action: () => void) {
  const lastActionAt = useRef(0);

  // פונקציה פנימית משותפת שמיישמת את ה-guard ומפעילה את ה-action
  const fire = useCallback(() => {
    const now = Date.now();
    if (now - lastActionAt.current < SAME_TAP_WINDOW_MS) return;
    lastActionAt.current = now;
    action();
  }, [action]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    // מונע click תאום שהדפדפן יוצר אחרי touch - בלי זה, אם ה-action (כמו
    // סגירת מודל) מסיר את הכפתור מה-DOM באופן מיידי, ה-click התאום שמגיע
    // אחריו "נופל" על מה שנחשף מתחתיו באותן קואורדינטות (למשל שורת המוצר
    // שמתחת למודל) ומפעיל אותו - נראה כאילו "המודל לא נסגר" כי הוא נפתח שוב.
    e.preventDefault();
    try { (e.currentTarget as HTMLElement).blur(); } catch { /* התעלם */ }
    fire();
    // בולע את ה-ghost click שהדפדפן מייצר אחרי touch — ה-click הסינתטי מגיע
    // לאחר שהמודל כבר נסגר ונופל על מה שנחשף מתחתיו. capture:true מבטיח
    // שהליסנר יקבל אותו לפני כל אלמנט אחר ויחסום אותו.
    const absorb = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', absorb, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', absorb, true), 600);
  }, [fire]);

  const onClick = useCallback(() => {
    fire();
  }, [fire]);

  return { onPointerUp, onClick };
}
