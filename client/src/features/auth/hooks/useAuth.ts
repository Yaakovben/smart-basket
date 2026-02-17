import { useState, useCallback, useEffect, useRef } from 'react';
import type { User, LoginMethod } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { isValidEmail, checkEmailDomainTypo } from '../helpers/auth-helpers';
import type { UseAuthReturn } from '../types/auth-types';
import { registerSchema, validateForm } from '../../../global/validation';
import { authApi } from '../../../services/api';

// ===== טיפוסים =====
interface UseAuthParams {
  onLogin: (user: User, loginMethod?: LoginMethod) => void;
}

// ===== Hook ראשי =====
export const useAuth = ({ onLogin }: UseAuthParams): UseAuthReturn => {
  const { t } = useSettings();

  // ===== מצב טופס =====
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // ===== אימות =====
  const validateRegisterForm = useCallback((): boolean => {
    const result = validateForm(registerSchema, {
      name: name.trim(),
      email: email.trim(),
      password
    });
    if (!result.success) {
      setError(t(result.error as Parameters<typeof t>[0]));
      return false;
    }
    return true;
  }, [name, email, password, t]);

  // ===== טיפול באימייל =====
  // בדיקת קיום אימייל מול ה-API
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
      const apiError = err as { code?: string; message?: string };
      if (apiError.code === 'ERR_NETWORK') {
        setError(t('networkError'));
      } else {
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setCheckingEmail(false);
    }
  }, [email, t]);

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
            // 405 = Method Not Allowed - בעיית מטמון, הצגת קישור לניקוי המטמון
            setError(t('cacheError'));
          }
          // לשגיאות אחרות, המשך בשקט - ייבדק בעת שליחת הטופס
        } finally {
          if (!controller.signal.aborted) {
            setCheckingEmail(false);
          }
        }
      }, 800);
    }
  }, [t]);

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
  }, [email, emailSuggestion]);

  const handleEmailSubmit = useCallback(async () => {
    setError('');

    // אימות האימייל תחילה
    if (!isValidEmail(email.trim())) {
      setError(t('invalidEmail'));
      return;
    }

    // אימות סיסמה (מינימום 8 תווים)
    if (!password || password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    // אם זהו תהליך משתמש חדש (שדה שם מוצג), בצע הרשמה
    if (isNewUser && emailChecked) {
      if (!validateRegisterForm()) return;

      setEmailLoading(true);
      try {
        const result = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password
        });
        if (!result || !result.user) {
          setError(t('noUserData'));
          setEmailLoading(false);
          return;
        }
        const { user } = result;
        haptic('medium');
        onLogin(user, 'email');
        return;
      } catch (registerError: unknown) {
        haptic('heavy');
        const regApiError = registerError as { response?: { data?: { message?: string; error?: string } }; code?: string; message?: string };
        const regErrorMsg = regApiError.response?.data?.message || regApiError.response?.data?.error || '';

        if (regApiError.code === 'ERR_NETWORK') {
          setError(t('networkError'));
        } else if (regApiError.message?.includes('localStorage')) {
          setError(t('localStorageError'));
        } else {
          setError(regErrorMsg || regApiError.message || t('unknownError'));
        }
      } finally {
        setEmailLoading(false);
      }
      return;
    }

    // ניסיון ראשון - התחברות
    setEmailLoading(true);
    try {
      const { user } = await authApi.login({ email: email.trim(), password });
      haptic('medium');
      onLogin(user, 'email');
    } catch (loginError: unknown) {
      const apiError = loginError as { response?: { status?: number; data?: { error?: string; message?: string } }; code?: string; message?: string };
      const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error || '';

      if (apiError.code === 'ERR_NETWORK') {
        haptic('heavy');
        setError(t('networkError'));
      } else if (apiError.message?.includes('localStorage')) {
        haptic('heavy');
        setError(t('localStorageError'));
      } else if (apiError.response?.status === 400 && errorMsg.toLowerCase().includes('google')) {
        haptic('heavy');
        setError(t('useGoogleSignIn'));
        setIsGoogleAccount(true);
        setEmailChecked(true);
      } else if (apiError.response?.status === 401) {
        haptic('heavy');
        setError(t('wrongPassword'));
      } else if (apiError.response?.status === 404 || errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('לא נמצא')) {
        // המשתמש לא קיים - הצגת שדה שם להרשמה
        haptic('light');
        setIsNewUser(true);
        setEmailChecked(true);
        setError('');
      } else if (errorMsg) {
        haptic('heavy');
        setError(errorMsg);
      } else {
        haptic('heavy');
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, name, emailChecked, isNewUser, validateRegisterForm, onLogin, t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleEmailSubmit();
  }, [handleEmailSubmit]);

  // ===== טיפול בהתחברות Google =====
  const handleGoogleSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
    setGoogleLoading(true);
    try {
      // שליחת טוקן Google לשרת
      const { user } = await authApi.googleAuth(tokenResponse.access_token);
      haptic('medium');
      onLogin(user, 'google');
    } catch (error: unknown) {
      haptic('heavy');
      const apiError = error as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string; message?: string };
      const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error;
      const status = apiError.response?.status;

      if (apiError.code === 'ERR_NETWORK' || status === 405) {
        setError(t('cacheError'));
      } else if (apiError.message?.includes('localStorage')) {
        setError(t('localStorageError'));
      } else if (errorMsg) {
        setError(errorMsg);
      } else if (status) {
        setError(t('cacheError'));
      } else {
        setError(t('cacheError'));
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [onLogin, t]);

  const handleGoogleError = useCallback(() => {
    haptic('heavy');
    setError(t('cacheError'));
    setGoogleLoading(false);
  }, [t]);

  // ===== טיפול בסיסמה =====
  const handlePasswordChange = useCallback((newPassword: string) => {
    setPassword(newPassword);
    // ניקוי שגיאה כשהמשתמש מקליד
    if (error) {
      setError('');
    }
  }, [error]);

  // ===== טיפול ב-UI =====
  const toggleEmailForm = useCallback(() => {
    setShowEmailForm(prev => !prev);
    setError('');
  }, []);

  // ===== ערך החזרה =====
  return {
    name,
    email,
    password,
    error,
    googleLoading,
    emailLoading,
    isNewUser,
    showEmailForm,
    emailSuggestion,
    emailChecked,
    isGoogleAccount,
    checkingEmail,

    setName,
    setEmail,
    setPassword,
    setError,
    setShowEmailForm,

    handleEmailChange,
    handlePasswordChange,
    handleEmailSubmit,
    handleSubmit,
    handleGoogleSuccess,
    handleGoogleError,
    toggleEmailForm,
    applySuggestion,
    isValidEmail,
    checkEmailExists
  };
};
