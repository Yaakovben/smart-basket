import { useEffect, useState } from 'react';
import { dailyFaithApi, type DailyFaith } from './daily-faith.api';
import { markPopupShown, safeStorage } from '../../global/helpers';

const STORAGE_KEY = 'sb_daily_faith_last_shown';
const SESSION_COUNT_KEY = 'sb_session_count';      // מונה מצטבר של סשנים (בדפדפן)
const SESSION_MARKER_KEY = 'sb_session_marker';    // דגל לסשן נוכחי (נמחק בסגירת דפדפן)
const MIN_SESSION_FOR_FAITH = 2;                    // לקוח חדש יראה רק מסשן 2
const RECENT_SEEN_KEY = 'sb_faith_recent_seen';     // מעקב אחרי משפטים שכבר הוצגו בשבועיים האחרונים
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;      // שבועיים במ"ש - אין חזרה על משפט בתקופה הזו

// מזהים של משפטים שהוצגו לאחרונה, עם timestamp. נשמרים רק אלה מהשבועיים האחרונים.
type RecentSeen = { id: string; at: number };

const getRecentSeen = (): RecentSeen[] => {
  const parsed = safeStorage.getJSON<RecentSeen[]>(RECENT_SEEN_KEY, []);
  const cutoff = Date.now() - TWO_WEEKS_MS;
  return Array.isArray(parsed) ? parsed.filter(r => r?.id && r.at > cutoff) : [];
};

const markFaithSeen = (id: string): void => {
  const current = getRecentSeen().filter(r => r.id !== id);
  current.push({ id, at: Date.now() });
  safeStorage.setJSON(RECENT_SEEN_KEY, current);
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * מחזיר את מספר הסשן הנוכחי של המשתמש בדפדפן הזה.
 * סשן חדש = פעם ראשונה שנפתחה האפליקציה מאז סגירת הדפדפן (sessionStorage ריק).
 * כל סשן חדש מקדם את המונה ב-localStorage.
 */
const getSessionNumber = (): number => {
  try {
    if (!sessionStorage.getItem(SESSION_MARKER_KEY)) {
      const prev = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10) || 0;
      const next = prev + 1;
      localStorage.setItem(SESSION_COUNT_KEY, String(next));
      sessionStorage.setItem(SESSION_MARKER_KEY, '1');
      return next;
    }
    return parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '1', 10) || 1;
  } catch {
    return 99; // אם storage חסום, לא נגביל
  }
};

// האם מציגים את הפופאפ בכל פתיחה (לא שומר "היום הוצג"):
// 1. בסביבת פיתוח (vite dev) — לנוחות עבודה
// 2. כשה-env var VITE_DAILY_FAITH_ALWAYS מוגדר ל-"true"
// 3. כש-hostname מכיל "non-prod" או "nonprod" (זיהוי non-prod אוטומטי לפי URL)
// בפרודקשן (hostname רגיל, בלי env var) הפופאפ יופיע פעם ביום בלבד.
const isNonProdHost = () => {
  if (typeof window === 'undefined') return false;
  return /non-?prod/i.test(window.location.hostname);
};

const ALWAYS_SHOW =
  import.meta.env.DEV ||
  import.meta.env.VITE_DAILY_FAITH_ALWAYS === 'true' ||
  isNonProdHost();

export function useDailyFaith(enabled: boolean) {
  const [quote, setQuote] = useState<DailyFaith | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!ALWAYS_SHOW && safeStorage.get(STORAGE_KEY) === todayStr()) return;
    // לקוח חדש - מדלגים על הסשן הראשון כדי לא להציף אותו בכניסה הראשונה לאפליקציה
    if (!ALWAYS_SHOW && getSessionNumber() < MIN_SESSION_FOR_FAITH) return;

    let cancelled = false;
    // השהייה קצרה כדי לא להתנגש עם טעינת המסך הראשי
    const timer = setTimeout(() => {
      // שולחים לשרת את המזהים שכבר ראינו בשבועיים האחרונים, כדי שיחזיר משפט שלא נראה.
      // getAll איננו זמין ל-non-admin, ולכן כל הסינון נעשה בשרת.
      const seenIds = getRecentSeen().map(r => r.id);
      dailyFaithApi
        .getRandom(seenIds)
        .then((q) => {
          if (!cancelled && q) {
            setQuote(q);
            markFaithSeen(q.id);
            // סימון בקואורדינטור שפופאפ נמצא על המסך - יחסום popups משניים בסשן זה
            markPopupShown('daily-faith');
          }
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
      safeStorage.set(STORAGE_KEY, todayStr());
    }
    setQuote(null);
  };

  return { quote, dismiss };
}
