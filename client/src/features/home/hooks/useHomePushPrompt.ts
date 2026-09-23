import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications } from '../../../global/hooks';
import { canShowSecondaryPopup, markPopupShown } from '../../../global/helpers';

// כל כמה זמן להציע שוב למשתמש שההתראות עדיין לא פעילות אצלו - "מדי פעם"
// ולא כל פתיחה, כדי לא להטריד, אבל גם לא לוותר לצמיתות אחרי דחייה אחת
// (בעבר pushPromptDismissed נשמר לצמיתות ב-localStorage - מי שדחה פעם
// אחת לא היה מקבל את ההצעה שוב אף פעם, גם חודשים אחר כך).
const PUSH_PROMPT_REASK_DAYS = 7;
const PUSH_PROMPT_LAST_SHOWN_KEY = 'pushPromptLastShownAt';

// מחליט מתי להציג את הצעת ההרשמה להתראות push במסך הבית, ומטפל בהרשמה/דחייה.
export function useHomePushPrompt() {
  const { isSupported: pushSupported, isPwaInstalled, isSubscribed: pushSubscribed, permission: pushPermission, subscribe: subscribePush, loading: pushLoading } = usePushNotifications();

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushPromptError, setPushPromptError] = useState(false);

  // הצגת הצעת push לאחר השהיה - רק אם אין popup אחר על המסך הסשן הזה,
  // ורק אם עברו PUSH_PROMPT_REASK_DAYS מאז שהוצגה בפעם האחרונה (או שמעולם
  // לא הוצגה). permission==='denied' נשאר חסום תמיד - הדפדפן חוסם בקשה
  // חוזרת מ-JS במצב הזה, וההצעה לא הייתה עושה כלום חוץ מלהטריד.
  useEffect(() => {
    if (pushSupported && isPwaInstalled && !pushSubscribed && !pushLoading && pushPermission !== 'denied') {
      if (!canShowSecondaryPopup()) return;
      const lastShown = Number(localStorage.getItem(PUSH_PROMPT_LAST_SHOWN_KEY) || 0);
      const daysSinceShown = (Date.now() - lastShown) / 86_400_000;
      if (lastShown && daysSinceShown < PUSH_PROMPT_REASK_DAYS) return;
      const timer = setTimeout(() => {
        // בדיקה מחודשת רגע לפני הצגה - שמא בינתיים הופיע popup אחר
        if (!canShowSecondaryPopup()) return;
        markPopupShown('push-notify');
        localStorage.setItem(PUSH_PROMPT_LAST_SHOWN_KEY, String(Date.now()));
        setShowPushPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [pushSupported, isPwaInstalled, pushSubscribed, pushLoading, pushPermission]);

  const handleDismissPushPrompt = useCallback(() => {
    setShowPushPrompt(false);
    // אין דחייה לצמיתות - ה-timestamp כבר נשמר ברגע ההצגה למעלה, אז ההצעה
    // הבאה תגיע רק אחרי PUSH_PROMPT_REASK_DAYS ימים, לא נעלמת לתמיד.
  }, []);

  const handleEnablePush = useCallback(async () => {
    setPushPromptError(false);
    const success = await subscribePush();
    if (success) {
      setShowPushPrompt(false);
    } else {
      // נשאר פתוח - HomeComponent מציג מצב שגיאה (pushPromptError) עם
      // כפתור 'הבנתי' במקום לסגור בשקט בלי שהמשתמש יבין שזה נכשל.
      setPushPromptError(true);
    }
  }, [subscribePush]);

  return {
    showPushPrompt,
    pushPromptError,
    pushLoading,
    handleEnablePush,
    handleDismissPushPrompt,
  };
}
