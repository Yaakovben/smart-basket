import { useEffect, useState } from 'react';
import { dailyFaithApi, type DailyFaith } from './daily-faith.api';

const STORAGE_KEY = 'sb_daily_faith_last_shown';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// מציג את הפופאפ בכל פתיחה (לא שומר "היום הוצג") כאשר:
// 1. רצים בסביבת פיתוח (vite dev) — לנוחות עבודה
// 2. ה-env var VITE_DAILY_FAITH_ALWAYS מוגדר ל-"true" (משמש ב-non-prod)
// בפרודקשן רגיל (בלי ה-env var) הפופאפ יופיע פעם ביום בלבד.
const ALWAYS_SHOW =
  import.meta.env.DEV || import.meta.env.VITE_DAILY_FAITH_ALWAYS === 'true';

export function useDailyFaith(enabled: boolean) {
  const [quote, setQuote] = useState<DailyFaith | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!ALWAYS_SHOW && localStorage.getItem(STORAGE_KEY) === todayStr()) return;

    let cancelled = false;
    // השהייה קצרה כדי לא להתנגש עם טעינת המסך הראשי
    const timer = setTimeout(() => {
      dailyFaithApi
        .getRandom()
        .then((q) => {
          if (!cancelled && q) setQuote(q);
        })
        .catch(() => {/* שקט */});
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  const dismiss = () => {
    if (!ALWAYS_SHOW) {
      localStorage.setItem(STORAGE_KEY, todayStr());
    }
    setQuote(null);
  };

  return { quote, dismiss };
}
