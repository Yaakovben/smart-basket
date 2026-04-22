import { useEffect, useState } from 'react';
import { dailyFaithApi, type DailyFaith } from './daily-faith.api';

const STORAGE_KEY = 'sb_daily_faith_last_shown';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function useDailyFaith(enabled: boolean) {
  const [quote, setQuote] = useState<DailyFaith | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (localStorage.getItem(STORAGE_KEY) === todayStr()) return;

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
    localStorage.setItem(STORAGE_KEY, todayStr());
    setQuote(null);
  };

  return { quote, dismiss };
}
