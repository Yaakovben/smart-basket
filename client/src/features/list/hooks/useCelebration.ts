import { useState, useRef, useEffect, useCallback } from 'react';
import type { Product } from '../../../global/types';
import { haptic } from '../../../global/helpers';

// חגיגת השלמת רשימה: overlay חד-פעמי שמופיע כשכל המוצרים ברשימה מסומנים
// כנקנים כתוצאה ישירה מפעולת המשתמש (markPurchased). פעולות שלא נחשבות
// "השלמה" (ניקוי, איפוס) משתמשות ב-clearMarked כדי למנוע חגיגה שגויה.
export const useCelebration = (products: Product[]) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // דגל שמסמן שהמשתמש סימן מוצר כנקנה (לזיהוי חגיגה ב-useEffect)
  const justMarkedPurchased = useRef(false);

  useEffect(() => () => clearTimeout(celebrationTimer.current), []);

  // זיהוי חגיגה: כל המוצרים נקנו + המשתמש זה עתה סימן מוצר
  useEffect(() => {
    if (!justMarkedPurchased.current) return;
    // איפוס הדגל תמיד כדי למנוע הפעלה שגויה מאירועי socket
    justMarkedPurchased.current = false;
    if (products.length > 0 && products.every((p: Product) => p.isPurchased)) {
      clearTimeout(celebrationTimer.current);
      setShowCelebration(true);
      haptic('heavy');
      celebrationTimer.current = setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [products]);

  const markPurchased = useCallback(() => { justMarkedPurchased.current = true; }, []);
  const clearMarked = useCallback(() => { justMarkedPurchased.current = false; }, []);

  return { showCelebration, markPurchased, clearMarked };
};
