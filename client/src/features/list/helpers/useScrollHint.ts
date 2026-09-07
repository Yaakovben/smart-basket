import { useCallback, useEffect, useRef, useState } from 'react';

// חיווי "יש עוד טקסט - אפשר לגלול" לפתק הערה. מחזיר ref לאלמנט הגולל
// (textarea בטופס / div במסך הפרטים), דגל showHint (יש חריגה *וגם* לא
// גוללנו עד הסוף), ו-onScroll לחיבור. בודק מחדש בכל שינוי של `dep`
// (תוכן ההערה) וגם דרך ResizeObserver (autosize של textarea, טעינת גופן).
export function useScrollHint<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T | null>(null);
  const [showHint, setShowHint] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollHeight - el.clientHeight;
    setShowHint(overflow > 4 && el.scrollTop < overflow - 4);
  }, []);

  useEffect(() => {
    // לא קוראים ל-check() סינכרונית בגוף ה-effect (cascading renders) -
    // rAF לפריים הבא + בדיקה נוספת אחרי שה-layout מתייצב (autosize, גופן).
    const raf = requestAnimationFrame(check);
    const id = window.setTimeout(check, 80);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(id); };
  }, [check, dep]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [check]);

  return { ref, showHint, onScroll: check };
}
