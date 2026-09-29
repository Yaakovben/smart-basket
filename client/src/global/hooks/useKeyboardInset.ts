import { useEffect, useState } from 'react';

// הגובה שהמקלדת מכסה בתחתית המסך. באייפון המקלדת מונחת מעל הדף בלי לכווץ
// אותו, וגיליון שצמוד לתחתית נשאר מתחתיה, כולל השדה שמקלידים בו. באנדרואיד
// המסך מתכווץ לבד ולכן הערך נשאר 0. פער קטן (סרגלי דפדפן) לא נחשב מקלדת.
const KEYBOARD_MIN_PX = 150;

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      setInset(covered > KEYBOARD_MIN_PX ? covered : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}
