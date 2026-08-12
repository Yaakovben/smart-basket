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
    // blur לפני הפעולה — מסיר פוקוס ויזואלי מהכפתור לאחר לחיצה
    try { (e.currentTarget as HTMLElement).blur(); } catch { /* התעלם אם הבלור נכשל */ }
    fire();
  }, [fire]);

  const onClick = useCallback(() => {
    fire();
  }, [fire]);

  return { onPointerUp, onClick };
}
