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
// מונה גלובלי של נעולים פעילים - מונע כפילויות כשכמה קומפוננטים קוראים במקביל
let lockCount = 0;
let savedScrollY = 0;

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const body = document.body;
    if (lockCount === 0) {
      // נעילה ראשונה - שומרים scrollY ומחילים את הסגנונות
      savedScrollY = window.scrollY;
      body.style.position = 'fixed';
      body.style.top = `-${savedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        // רק כשכל הנעולים נסגרו - משחררים את ה-body תמיד למצב נקי
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.width = '';
        body.style.overflow = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
