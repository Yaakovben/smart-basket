import { useEffect } from 'react';

/**
 * useBodyScrollLock - נועל גלילה של ה-body כל עוד הקומפוננט mounted.
 * פותר באג ידוע ב-iOS Safari שבו overflow:hidden לא מספיק והתוכן מאחורי
 * modal ממשיך להיגרל (scroll chaining).
 *
 * הפתרון: position:fixed על ה-body עם top שלילי בגובה ה-scrollY הנוכחי,
 * כדי לשמר את המיקום החזותי. בסיום: החזרת הסגנונות + scrollTo למיקום המקורי.
 *
 * שימוש: useBodyScrollLock(isOpen) בתוך רכיב modal.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    const body = document.body;
    // שומרים את הסגנונות המקוריים כדי לשחזר מדויק
    const original = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.left = original.left;
      body.style.right = original.right;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      // חזרה למיקום המקורי - חשוב, אחרת העמוד "קופץ" למעלה
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
