import { useState, useCallback, useEffect, useRef } from 'react';
import type { User, LoginMethod } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { isValidEmail, checkEmailDomainTypo } from '../helpers/auth-helpers';
import type { UseAuthReturn } from '../types/auth-types';
import { loginSchema, registerSchema, validateForm } from '../../../global/validation';
import { authApi } from '../../../services/api';

// ===== Types =====
interface UseAuthParams {
  onLogin: (user: User, loginMethod?: LoginMethod) => void;
}

// ===== Hook =====
export const useAuth = ({ onLogin }: UseAuthParams): UseAuthReturn => {
  const { t } = useSettings();

  // ===== Form State =====
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

  // ===== Validation =====
  const validateLoginForm = useCallback((): boolean => {
    const result = validateForm(loginSchema, { email: email.trim(), password });
    if (!result.success) {
      setError(t(result.error as Parameters<typeof t>[0]));
      return false;
    }
    return true;
  }, [email, password, t]);

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

  // ===== Email Handlers =====
  // Check email existence via API
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
        setError('שגיאת חיבור לשרת');
      } else {
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setCheckingEmail(false);
    }
  }, [email, t]);

  // Debounce email suggestion to avoid showing while typing
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    setError('');
    // Reset email check state when email changes
    setEmailChecked(false);
    setIsNewUser(false);
    setIsGoogleAccount(false);

    // Clear previous suggestion immediately when typing
    setEmailSuggestion(null);

    // Clear existing timer
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    // Check for domain typos after user stops typing (500ms delay)
    suggestionTimerRef.current = setTimeout(() => {
      const suggestion = checkEmailDomainTypo(newEmail);
      setEmailSuggestion(suggestion);
    }, 500);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  const applySuggestion = useCallback(() => {
    if (emailSuggestion && email.includes('@')) {
      const localPart = email.split('@')[0];
      const correctedEmail = `${localPart}@${emailSuggestion}`;
      setEmail(correctedEmail);
      setEmailSuggestion(null);
      // Reset email check state when email changes
      setEmailChecked(false);
      setIsNewUser(false);
      setIsGoogleAccount(false);
    }
  }, [email, emailSuggestion]);

  const handleEmailSubmit = useCallback(async () => {
    setError('');

    // If email not checked yet, check it first
    if (!emailChecked) {
      await checkEmailExists();
      return;
    }

    // If this is a Google account, show error
    if (isGoogleAccount) {
      setError(t('useGoogleSignIn'));
      return;
    }

    // If new user, register
    if (isNewUser) {
      if (!validateRegisterForm()) return;

      setEmailLoading(true);
      try {
        const result = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password
        });
        if (!result || !result.user) {
          setError('שגיאה: לא התקבל מידע משתמש מהשרת');
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
          setError('שגיאת חיבור לשרת');
        } else if (regApiError.message?.includes('localStorage')) {
          setError('לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.');
        } else {
          setError(regErrorMsg || regApiError.message || t('unknownError'));
        }
      } finally {
        setEmailLoading(false);
      }
      return;
    }

    // Existing user - login
    if (!validateLoginForm()) return;

    setEmailLoading(true);
    try {
      const { user } = await authApi.login({ email: email.trim(), password });
      haptic('medium');
      onLogin(user, 'email');
    } catch (loginError: unknown) {
      const apiError = loginError as { response?: { status?: number; data?: { error?: string; message?: string } }; code?: string; message?: string };
      const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error || '';

      haptic('heavy');

      if (apiError.code === 'ERR_NETWORK') {
        setError('שגיאת חיבור לשרת');
      } else if (apiError.message?.includes('localStorage')) {
        setError('לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.');
      } else if (apiError.response?.status === 400 && errorMsg.toLowerCase().includes('google')) {
        setError(t('useGoogleSignIn'));
      } else if (apiError.response?.status === 401) {
        setError(t('wrongPassword'));
      } else if (errorMsg) {
        setError(errorMsg);
      } else {
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, name, emailChecked, isNewUser, isGoogleAccount, validateLoginForm, validateRegisterForm, onLogin, t, checkEmailExists]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleEmailSubmit();
  }, [handleEmailSubmit]);

  // ===== Google Auth Handlers =====
  const handleGoogleSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
    setGoogleLoading(true);
    try {
      // Send Google access token to our server
      const { user } = await authApi.googleAuth(tokenResponse.access_token);
      haptic('medium');
      onLogin(user, 'google');
    } catch (error: unknown) {
      haptic('heavy');
      const apiError = error as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string; message?: string };
      const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error;
      const status = apiError.response?.status;

      if (apiError.code === 'ERR_NETWORK') {
        setError('שגיאת חיבור לשרת');
      } else if (apiError.message?.includes('localStorage')) {
        setError('לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.');
      } else if (errorMsg) {
        setError(errorMsg);
      } else if (status) {
        setError(`${t('unknownError')} (${status})`);
      } else {
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [onLogin, t]);

  const handleGoogleError = useCallback(() => {
    haptic('heavy');
    setError('שגיאה בהתחברות עם Google');
    setGoogleLoading(false);
  }, []);

  // ===== UI Handlers =====
  const toggleEmailForm = useCallback(() => {
    setShowEmailForm(prev => !prev);
    setError('');
  }, []);

  // ===== Return =====
  return {
    // State
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

    // Setters
    setName,
    setEmail,
    setPassword,
    setError,
    setShowEmailForm,

    // Handlers
    handleEmailChange,
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
