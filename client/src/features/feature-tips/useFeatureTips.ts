import { useEffect, useState } from 'react';
import { safeStorage, markPopupShown, canShowSecondaryPopup } from '../../global/helpers';
import { FEATURE_TIPS, type FeatureTip } from './tips';

const SESSION_COUNT_KEY = 'sb_session_count';       // מונה סשנים משותף (זהה ל-useDailyFaith)
const SESSION_MARKER_KEY = 'sb_session_marker';
const SEEN_KEY = 'sb_feature_tips_seen';            // מזהי טיפים שכבר הוצגו (מתאפס כשכולם הוצגו)
const SESSION_SHOWN_KEY = 'sb_feature_tip_session_shown'; // הוצג בסשן הזה (הגנה מ-reload)

const MIN_SESSION = 3;        // לא מציקים למשתמש חדש - רק מהסשן השלישי
const SHOW_EVERY = 3;         // פעם בכל 3 פתיחות
const DELAY_MS = 12_000;      // 12 שניות שימוש לפני שהטיפ קופץ

const getSessionNumber = (): number => {
  try {
    if (!sessionStorage.getItem(SESSION_MARKER_KEY)) {
      // useDailyFaith עשוי כבר לקדם את המונה בסשן הזה - במקרה כזה SESSION_MARKER
      // כבר קיים ולא ניכנס לכאן. אם לא - מקדמים.
      const prev = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10) || 0;
      const next = prev + 1;
      localStorage.setItem(SESSION_COUNT_KEY, String(next));
      sessionStorage.setItem(SESSION_MARKER_KEY, '1');
      return next;
    }
    return parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '1', 10) || 1;
  } catch {
    return 1;
  }
};

// בוחר טיפ שעדיין לא הוצג. כשכולם הוצגו - מאפסים ומתחילים סבב חדש.
const pickTip = (): FeatureTip | null => {
  if (FEATURE_TIPS.length === 0) return null;
  let seen = safeStorage.getJSON<string[]>(SEEN_KEY, []);
  if (!Array.isArray(seen)) seen = [];
  let pool = FEATURE_TIPS.filter(t => !seen.includes(t.id));
  if (pool.length === 0) {
    seen = [];
    pool = FEATURE_TIPS;
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

const markSeen = (id: string) => {
  let seen = safeStorage.getJSON<string[]>(SEEN_KEY, []);
  if (!Array.isArray(seen)) seen = [];
  if (!seen.includes(id)) seen.push(id);
  if (seen.length >= FEATURE_TIPS.length) seen = []; // סבב הושלם - איפוס
  safeStorage.setJSON(SEEN_KEY, seen);
};

// טיפ "ידעת ש...?" שקופץ פעם בכמה פתיחות, אחרי 12 שניות, ורק אם שום פופאפ
// אחר לא הוצג בסשן הזה (popupCoordinator). enabled = משתמש מחובר.
export function useFeatureTips(enabled: boolean) {
  const [tip, setTip] = useState<FeatureTip | null>(null);

  useEffect(() => {
    if (!enabled) return;

    try {
      if (sessionStorage.getItem(SESSION_SHOWN_KEY) === '1') return;
    } catch { /* */ }

    const session = getSessionNumber();
    if (session < MIN_SESSION) return;
    if (session % SHOW_EVERY !== 0) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      // לא מתנגשים: פופאפ אחר כבר הוצג בסשן (למשל החיזוק היומי ב-10ש'),
      // מודאל פתוח כרגע, או שהמשתמש כבר לא במסך הבית.
      if (!canShowSecondaryPopup()) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (window.location.pathname !== '/') return;

      const picked = pickTip();
      if (!picked) return;
      setTip(picked);
      markPopupShown('feature-tip');
      try { sessionStorage.setItem(SESSION_SHOWN_KEY, '1'); } catch { /* */ }
    }, DELAY_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled]);

  const dismiss = () => {
    if (tip) markSeen(tip.id);
    setTip(null);
  };

  return { tip, dismiss };
}
