import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications } from '../../../global/hooks';
import { canShowSecondaryPopup, markPopupShown } from '../../../global/helpers';

// מחליט מתי להציג את הצעת ההרשמה להתראות push במסך הבית, ומטפל בהרשמה/דחייה.
export function useHomePushPrompt() {
  const { isSupported: pushSupported, isPwaInstalled, isSubscribed: pushSubscribed, permission: pushPermission, subscribe: subscribePush, loading: pushLoading } = usePushNotifications();

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushPromptError, setPushPromptError] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(() => {
    return localStorage.getItem('pushPromptDismissed') === 'true';
  });

  // הצגת הצעת push לאחר השהיה - רק אם אין popup אחר על המסך הסשן הזה
  useEffect(() => {
    if (pushSupported && isPwaInstalled && !pushSubscribed && !pushPromptDismissed && !pushLoading && pushPermission !== 'denied') {
      if (!canShowSecondaryPopup()) return;
      const timer = setTimeout(() => {
        // בדיקה מחודשת רגע לפני הצגה - שמא בינתיים הופיע popup אחר
        if (!canShowSecondaryPopup()) return;
        markPopupShown('push-notify');
        setShowPushPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [pushSupported, isPwaInstalled, pushSubscribed, pushPromptDismissed, pushLoading, pushPermission]);

  const handleDismissPushPrompt = useCallback(() => {
    setShowPushPrompt(false);
    setPushPromptDismissed(true);
    localStorage.setItem('pushPromptDismissed', 'true');
  }, []);

  const handleEnablePush = useCallback(async () => {
    setPushPromptError(false);
    const success = await subscribePush();
    if (success) {
      setShowPushPrompt(false);
    } else {
      // הצגת שגיאה בהצעה - סגירת הפרומפט וניווט להגדרות לפרטים
      handleDismissPushPrompt();
    }
  }, [subscribePush, handleDismissPushPrompt]);

  return {
    showPushPrompt,
    pushPromptError,
    pushLoading,
    handleEnablePush,
    handleDismissPushPrompt,
  };
}
