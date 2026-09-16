import { useState, useEffect, useCallback } from 'react';
import { canShowSecondaryPopup, markPopupShown, safeStorage, getAppOpenCount } from '../../../global/helpers';

const SHOWN_KEY = 'sb_feedback_shown';
// מעל 20 פתיחות - מספיק היכרות עם האפליקציה כדי שתהיה למשתמש דעה
// אמיתית, לא פופאפ שקופץ על משתמש חדש שבקושי הספיק לנסות אותה.
const OPEN_COUNT_THRESHOLD = 20;

// פופאפ "ספרו לנו מה דעתכם" - פעם אחת בלבד לכל משתמש (לצמיתות, לא רק
// לסשן - ראו SHOWN_KEY), ורק אחרי OPEN_COUNT_THRESHOLD פתיחות אפליקציה.
export function useFeedbackPopup() {
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

  useEffect(() => {
    if (safeStorage.get(SHOWN_KEY) === 'true') return;
    if (getAppOpenCount() <= OPEN_COUNT_THRESHOLD) return;
    if (!canShowSecondaryPopup()) return;
    const timer = setTimeout(() => {
      // בדיקה מחודשת רגע לפני הצגה - שמא בינתיים הופיע popup אחר
      if (safeStorage.get(SHOWN_KEY) === 'true') return;
      if (!canShowSecondaryPopup()) return;
      markPopupShown('feedback');
      safeStorage.set(SHOWN_KEY, 'true');
      setShowFeedbackPopup(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleCloseFeedbackPopup = useCallback(() => {
    setShowFeedbackPopup(false);
  }, []);

  return { showFeedbackPopup, handleCloseFeedbackPopup };
}
