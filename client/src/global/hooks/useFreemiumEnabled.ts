import { useEffect, useState } from 'react';
import { subscriptionApi } from '../../services/api/subscription.api';

// נשלף פעם אחת ומוחזק במודול (לא ב-state של קומפוננטה בודדת) כדי שכל
// המקומות שמשתמשים ב-hook הזה (הגדרות, אדמין, ראוטר) יראו את אותה תשובה
// בלי לירות בקשת רשת כפולה לכל אחד מהם.
let cached: boolean | null = null;
let inFlight: Promise<boolean> | null = null;

function fetchFreemiumEnabled(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = subscriptionApi.getConfig()
      .then(({ freemiumEnabled }) => { cached = freemiumEnabled; return freemiumEnabled; })
      .catch(() => false) // כשל רשת - עדיף להסתיר את ממשק המנוי מאשר להציג אותו בטעות
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

// null עד שהתשובה חזרה מהשרת. לדף המנוי עצמו: מחכים לתשובה לפני שמחליטים,
// אחרת פתיחה ישירה של הדף (למשל מהתראה) הייתה מפנה לבית גם כשהמנוי פועל.
export function useFreemiumState(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(cached);
  useEffect(() => {
    let cancelled = false;
    fetchFreemiumEnabled().then(v => { if (!cancelled) setEnabled(v); });
    return () => { cancelled = true; };
  }, []);
  return enabled;
}

// true רק אחרי שהתשובה חזרה מהשרת - עד אז false, כדי לא להבהב את ממשק
// המנוי לרגע לפני שמסתירים אותו בסביבה שבה הוא כבוי.
export function useFreemiumEnabled(): boolean {
  return useFreemiumState() ?? false;
}
