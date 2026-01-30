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
  // Note: With API, we can't easily check if email exists beforehand
  // So we'll always show name field and let the server handle it
  const checkEmailExists = useCallback((emailToCheck: string) => {
    if (!isValidEmail(emailToCheck)) return;
    // Don't automatically set isNewUser - let the user decide or server response guide us
  }, []);

  // Debounce email suggestion to avoid showing while typing
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    setError('');
    checkEmailExists(newEmail);

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
  }, [checkEmailExists]);

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
      checkEmailExists(correctedEmail);
    }
  }, [email, emailSuggestion, checkEmailExists]);

  const handleEmailSubmit = useCallback(async () => {
    setError('');

    // If name is provided, try to register first
    if (name.trim()) {
      if (!validateRegisterForm()) return;

      setEmailLoading(true);
      try {
        const result = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password
        });
        // DEBUG: Show what we got back
        console.log('[AUTH DEBUG] Register result:', result);
        if (!result || !result.user) {
          setError('שגיאה: לא התקבל מידע משתמש מהשרת');
          setEmailLoading(false);
          return;
        }
        const { user } = result;
        haptic('medium');
        // DEBUG: Before calling onLogin
        console.log('[AUTH DEBUG] Calling onLogin with user:', user.id, user.name);
        onLogin(user, 'email');
        // DEBUG: After onLogin (should redirect, so this might not show)
        console.log('[AUTH DEBUG] onLogin completed');
        return;
      } catch (registerError: unknown) {
        const regError = registerError as { response?: { status?: number; data?: { message?: string; error?: string } } };
        const regErrorMsg = regError.response?.data?.message || regError.response?.data?.error || '';

        // If email already exists (409 conflict), try to login instead
        if (regError.response?.status === 409 ||
            regErrorMsg?.toLowerCase().includes('already exists') ||
            regErrorMsg?.toLowerCase().includes('already registered')) {
          // Email exists, try login
          try {
            const { user } = await authApi.login({ email: email.trim(), password });
            haptic('medium');
            onLogin(user, 'email');
            return;
          } catch (loginError: unknown) {
            const apiError = loginError as { response?: { status?: number; data?: { error?: string; message?: string } }; message?: string };
            const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error || '';

            haptic('heavy');
            if (apiError.message?.includes('localStorage')) {
              setError('לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.');
            } else if (apiError.response?.status === 400 && errorMsg.toLowerCase().includes('google')) {
              setError(t('useGoogleSignIn'));
            } else {
              setError(t('wrongPassword'));
            }
            setEmailLoading(false);
            return;
          }
        } else {
          haptic('heavy');
          const regApiError = registerError as { code?: string; message?: string };
          if (regApiError.code === 'ERR_NETWORK') {
            setError('שגיאת חיבור לשרת');
          } else if (regApiError.message?.includes('localStorage')) {
            setError('לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.');
          } else {
            setError(regErrorMsg || regApiError.message || t('unknownError'));
          }
          setEmailLoading(false);
          return;
        }
      } finally {
        setEmailLoading(false);
      }
    }

    // No name provided - try login
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

      // Check for network error
      if (apiError.code === 'ERR_NETWORK') {
        setError('שגיאת חיבור לשרת');
      // Check for localStorage error
      } else if (apiError.message?.includes('localStorage')) {
        setError('לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.');
      // Check if user registered with Google (400 Bad Request with specific message)
      } else if (apiError.response?.status === 400 && errorMsg.toLowerCase().includes('google')) {
        setError(t('useGoogleSignIn'));
      } else if (apiError.response?.status === 401) {
        // User doesn't exist or wrong password
        // Show name field and ask user to fill it if they're new
        setIsNewUser(true);
        setError(t('loginOrRegisterHint'));
      } else if (errorMsg) {
        setError(errorMsg);
      } else {
        setError(apiError.message || t('unknownError'));
      }
    } finally {
      setEmailLoading(false);
    }
  }, [email, password, name, validateLoginForm, validateRegisterForm, onLogin, t]);

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
    isValidEmail
  };
};
