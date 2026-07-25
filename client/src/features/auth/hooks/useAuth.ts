import { useState, useCallback, useEffect } from 'react';
import type { User, LoginMethod } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { isValidEmail } from '../helpers/auth-helpers';
import { registerSchema, validateForm } from '../../../global/validation';
import type { UseAuthReturn } from '../types/auth-types';
import { authApi } from '../../../services/api';
import { trackEvent } from '../../../global/services/analytics';
import { useEmailAvailability } from './useEmailAvailability';

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
  // true אם emailLoading נמשך יותר מכמה שניות - מבדיל בין "עומד לענות תכף"
  // ל"תקוע/שרת קר", כדי שהמשתמש לא ירגיש שהכפתור לא הגיב לו.
  const [slowSubmit, setSlowSubmit] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // ===== טיפול באימייל (debounce, typo-suggestion, בדיקת קיום) =====
  const { handleEmailChange, applySuggestion, checkEmailExists } = useEmailAvailability({
    email, setEmail, setEmailChecked, setIsNewUser, setIsGoogleAccount,
    emailSuggestion, setEmailSuggestion, setCheckingEmail, setError, t
  });

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

  // מציג רמז "עדיין מתחברים" אם emailLoading נמשך יותר מ-6 שניות - לא נוגע
  // בטיימאאוט/retry האמיתיים של axios, רק בפידבק הוויזואלי.
  useEffect(() => {
    if (!emailLoading) {
      setSlowSubmit(false);
      return;
    }
    const timer = setTimeout(() => setSlowSubmit(true), 6000);
    return () => clearTimeout(timer);
  }, [emailLoading]);

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
        trackEvent('user_signed_up', { method: 'email' });
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
        } else if ((regApiError as { response?: { status?: number } }).response?.status === 429) {
          setError(t('tooManyAttempts'));
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
      trackEvent('user_logged_in', { method: 'email' });
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
      } else if (apiError.response?.status === 429) {
        haptic('heavy');
        setError(t('tooManyAttempts'));
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
      // ניסיון ראשון + retry אחד במקרה של שגיאת רשת
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const { user } = await authApi.googleAuth(tokenResponse.access_token);
          haptic('medium');
          trackEvent('user_logged_in', { method: 'google' });
          onLogin(user, 'google');
          return;
        } catch (error: unknown) {
          lastError = error;
          const apiError = error as { code?: string; response?: { status?: number } };
          const isNetworkError = apiError.code === 'ERR_NETWORK' || !apiError.response;
          if (attempt === 0 && isNetworkError) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          break;
        }
      }

      haptic('heavy');
      const apiError = lastError as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string; message?: string };
      const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error;
      const status = apiError.response?.status;

      if (apiError.code === 'ERR_NETWORK') {
        setError(t('networkError'));
      } else if (status === 405) {
        setError(t('cacheError'));
      } else if (apiError.message?.includes('localStorage')) {
        setError(t('localStorageError'));
      } else if (status === 429) {
        setError(t('tooManyAttempts'));
      } else if (errorMsg) {
        setError(errorMsg);
      } else {
        setError(t('networkError'));
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [onLogin, t]);

  const handleGoogleError = useCallback(() => {
    haptic('heavy');
    setError(t('networkError'));
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
    slowSubmit,
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
