import { useCallback, useRef } from 'react';

// חלון הזמן שבו click טבעי שמגיע מיד אחרי pointerup נחשב "אותה לחיצה" ומתעלמים
// ממנו - מונע הפעלה כפולה על מגע/עכבר (שם click תמיד יורה גם אחרי pointerup).
// הפעלה במקלדת (Enter/Space על כפתור ממוקד) לא עוברת דרך pointerup בכלל -
// רק click סינתטי - ולכן תמיד עוברת דרך ה-fallback הזה.
const SAME_TAP_WINDOW_MS = 500;

/**
 * מפעיל action פעם אחת בדיוק ללחיצה: onPointerUp מטפל במגע/עכבר (אמין יותר
 * מ-onClick הרגיל על חלק מהמכשירים - ראה HomeHeader/HomeBottomNav), ו-onClick
 * נשאר כ-fallback ל-activation במקלדת בלבד, כדי לא לאבד נגישות.
 */
export function useReliableTap(action: () => void) {
  const lastPointerActionAt = useRef(0);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).blur();
    lastPointerActionAt.current = Date.now();
    action();
  }, [action]);

  const onClick = useCallback(() => {
    if (Date.now() - lastPointerActionAt.current < SAME_TAP_WINDOW_MS) return;
    action();
  }, [action]);

  return { onPointerUp, onClick };
}
