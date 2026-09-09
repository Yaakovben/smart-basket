import { useEffect, useState } from 'react';
import { markPopupShown, canShowSecondaryPopup } from '../../global/helpers';

const SESSION_COUNT_KEY = 'sb_session_count';       // מונה סשנים משותף (זהה ל-useDailyFaith)
const SESSION_MARKER_KEY = 'sb_session_marker';
const SESSION_SHOWN_KEY = 'sb_feature_tip_session_shown'; // הוצג בסשן הזה (הגנה מ-reload)

const MIN_SESSION = 3;        // לא מציקים למשתמש חדש - רק מהסשן השלישי
const SHOW_EVERY = 3;         // פעם בכל 3 פתיחות
const DELAY_MS = 12_000;      // 12 שניות שימוש לפני שהקרוסלה קופצת

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

// קרוסלת טיפים "ידעת ש...?" שקופצת פעם בכמה פתיחות, אחרי 12 שניות, ורק אם
// שום פופאפ אחר לא הוצג בסשן הזה (popupCoordinator). enabled = משתמש מחובר.
// בניגוד לגרסה הקודמת - כל הופעה מציגה את *כל* הטיפים כקרוסלה לדפדוף
// (ראו FeatureTipsPopup), לא טיפ בודד אקראי; אין יותר מעקב "מי כבר נראה".
export function useFeatureTips(enabled: boolean) {
  const [show, setShow] = useState(false);

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

      setShow(true);
      markPopupShown('feature-tip');
      try { sessionStorage.setItem(SESSION_SHOWN_KEY, '1'); } catch { /* */ }
    }, DELAY_MS);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled]);

  const dismiss = () => setShow(false);

  return { show, dismiss };
}
