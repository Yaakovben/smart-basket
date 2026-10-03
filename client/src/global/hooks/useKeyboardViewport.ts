import { useEffect, useState } from 'react';

// האזור הגלוי של המסך כשהמקלדת פתוחה (באייפון), או null כשאין מקלדת.
//
// באייפון המקלדת מונחת מעל הדף בלי לכווץ אותו, ולפעמים הדפדפן גם גולל את הדף
// למעלה כדי לחשוף את השדה. גיליון שצמוד לתחתית נשאר אז מתחת למקלדת. במקום
// להרים אותו ב-margin (שהצטבר עם הגלילה של הדפדפן והעיף את הגיליון לראש המסך),
// מחזירים את המלבן הגלוי עצמו: top ו-height, וה-Dialog ממוקם בדיוק עליו.
//
// שלושה כללים כדי שלא יקפוץ:
//  • מקלדת נחשבת פתוחה רק כששדה הקלדה בפוקוס. זום בשתי אצבעות, או ערך שנשאר
//    אחרי שהמקלדת נסגרה, לא נחשבים, ולכן הגיליון לא נפתח באמצע או למעלה.
//  • שינויים קטנים מ-KEYBOARD_JITTER_PX מתעלמים מהם: באייפון כל הקשה גוללת
//    מעט את האזור הגלוי כדי לשמור על הסמן, וזה הזיז את הכל בכל אות.
//  • עדכון אחד לכל פריים, בלי אנימציה על המיקום.
const KEYBOARD_MIN_PX = 150;
const KEYBOARD_JITTER_PX = 6;

export interface KeyboardViewport { top: number; height: number }

const isEditable = (el: Element | null): boolean => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(type);
  }
  return (el as HTMLElement).isContentEditable;
};

export function useKeyboardViewport(): KeyboardViewport | null {
  const [box, setBox] = useState<KeyboardViewport | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const zoomed = vv.scale > 1.01;
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      const open = !zoomed && isEditable(document.activeElement) && covered > KEYBOARD_MIN_PX;
      setBox(prev => {
        if (!open) return prev ? null : prev;
        const next = { top: Math.round(vv.offsetTop), height: Math.round(vv.height) };
        if (prev && Math.abs(prev.top - next.top) < KEYBOARD_JITTER_PX && Math.abs(prev.height - next.height) < KEYBOARD_JITTER_PX) return prev;
        return next;
      });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    // אחרי יציאה משדה המקלדת נסגרת באנימציה: מודדים שוב כשהיא הסתיימה
    const onFocusOut = () => { schedule(); window.setTimeout(schedule, 350); };
    measure();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  return box;
}
