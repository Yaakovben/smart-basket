import { useCallback, useEffect, useRef } from 'react';
import { isValidEmail, checkEmailDomainTypo } from '../helpers/auth-helpers';
import { authApi } from '../../../services/api';
import type { TranslationKeys } from '../../../global/i18n/translations';

// ===== טיפוסים =====
interface UseEmailAvailabilityParams {
  email: string;
  setEmail: (email: string) => void;
  setEmailChecked: (checked: boolean) => void;
  setIsNewUser: (isNew: boolean) => void;
  setIsGoogleAccount: (isGoogle: boolean) => void;
  emailSuggestion: string | null;
  setEmailSuggestion: (suggestion: string | null) => void;
  setCheckingEmail: (checking: boolean) => void;
  setError: (error: string) => void;
  t: (key: TranslationKeys) => string;
}

// ===== Hook לבדיקת קיום אימייל + הצעת תיקון typo בדומיין =====
// מפעיל state שמנוהל ב-useAuth (מועבר כפרמטרים/setters) - השייכות המשותפת
// ל-error/emailChecked וכו' נשארת מרוכזת שם, כאן רק לוגיקת ה-debounce עצמה.
export const useEmailAvailability = ({
  email, setEmail, setEmailChecked, setIsNewUser, setIsGoogleAccount,
  emailSuggestion, setEmailSuggestion, setCheckingEmail, setError, t
}: UseEmailAvailabilityParams) => {
  // בדיקת קיום אימייל מול ה-API (שימוש ידני, לא דרך ה-debounce)
  const checkEmailExists = useCallback(async () => {
    if (!isValidEmail(email.trim())) {
      setError(t('invalidEmail'));
      return;
    }

    setCheckingEmail(true);
    setError('');

    try {
      const result = await authApi.checkEmail(email.trim());
      setEmailChecked(true);
      setIsNewUser(!result.exists);
      setIsGoogleAccount(result.isGoogleAccount);

      if (result.isGoogleAccount) {
        setError(t('useGoogleSignIn'));
      }
    } catch (err: unknown) {
      const apiError = err as { code?: string; message?: string; response?: { status?: number } };
      if (apiError.code === 'ERR_NETWORK') {
        setError(t('networkError'));
      } else if (apiError.response?.status === 429) {
        setError(t('tooManyAttempts'));
      } else {
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setCheckingEmail(false);
    }
  }, [email, t, setError, setEmailChecked, setIsNewUser, setIsGoogleAccount, setCheckingEmail]);

  // Debounce להצעת תיקון אימייל ובדיקתו כדי למנוע קריאות בזמן הקלדה
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const emailRef = useRef(email);
  emailRef.current = email;

  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    setError('');
    // איפוס מצב בדיקת האימייל בעת שינוי האימייל
    setEmailChecked(false);
    setIsNewUser(false);
    setIsGoogleAccount(false);

    // ניקוי הצעת תיקון קודמת מיד עם תחילת ההקלדה
    setEmailSuggestion(null);

    // ניקוי טיימרים קיימים
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }
    if (emailCheckTimerRef.current) {
      clearTimeout(emailCheckTimerRef.current);
    }
    // ביטול בקשת בדיקת אימייל שבטיסה
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // בדיקת שגיאות הקלדה בדומיין אחרי שהמשתמש מפסיק להקליד (עיכוב 500ms)
    suggestionTimerRef.current = setTimeout(() => {
      const suggestion = checkEmailDomainTypo(newEmail);
      setEmailSuggestion(suggestion);
    }, 500);

    // בדיקה אוטומטית של קיום אימייל אחרי שהמשתמש מפסיק להקליד (עיכוב 800ms)
    if (isValidEmail(newEmail.trim())) {
      emailCheckTimerRef.current = setTimeout(async () => {
        const trimmedEmail = newEmail.trim();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setCheckingEmail(true);
        try {
          const result = await authApi.checkEmail(trimmedEmail, { signal: controller.signal });
          // אימות שהאימייל לא השתנה בזמן שהבקשה בטיסה
          if (controller.signal.aborted || emailRef.current.trim() !== trimmedEmail) return;
          setEmailChecked(true);
          setIsNewUser(!result.exists);
          setIsGoogleAccount(result.isGoogleAccount);
          if (result.isGoogleAccount) {
            setError(t('useGoogleSignIn'));
          }
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          // הצגת שגיאה לבעיות רשת/שרת
          const apiError = err as { response?: { status?: number; data?: unknown }; code?: string; config?: { baseURL?: string } };
          if (apiError.code === 'ERR_NETWORK') {
            setError(t('networkError'));
          } else if (apiError.response?.status === 405) {
            // קורה כשמטמון ישן מחזיר תגובה עם שיטה שגויה
            setError(t('cacheError'));
          } else if (apiError.response?.status === 429) {
            setError(t('tooManyAttempts'));
          }
          // לשגיאות אחרות, המשך בשקט - ייבדק בעת שליחת הטופס
        } finally {
          if (!controller.signal.aborted) {
            setCheckingEmail(false);
          }
        }
      }, 800);
    }
  }, [t, setEmail, setError, setEmailChecked, setIsNewUser, setIsGoogleAccount, setEmailSuggestion, setCheckingEmail]);

  // ניקוי טיימרים ו-AbortController בעת הסרת הקומפוננטה
  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
      if (emailCheckTimerRef.current) {
        clearTimeout(emailCheckTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const applySuggestion = useCallback(() => {
    if (emailSuggestion && email.includes('@')) {
      const localPart = email.split('@')[0];
      const correctedEmail = `${localPart}@${emailSuggestion}`;
      setEmail(correctedEmail);
      setEmailSuggestion(null);
      // איפוס מצב בדיקת האימייל בעת שינוי האימייל
      setEmailChecked(false);
      setIsNewUser(false);
      setIsGoogleAccount(false);
    }
  }, [email, emailSuggestion, setEmail, setEmailSuggestion, setEmailChecked, setIsNewUser, setIsGoogleAccount]);

  return { handleEmailChange, applySuggestion, checkEmailExists };
};
