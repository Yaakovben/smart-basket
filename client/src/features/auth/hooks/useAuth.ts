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
    // With server-side auth, we just set isNewUser to true to show name field
    // The server will handle the actual login vs register logic
    setIsNewUser(true);
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

    // First try to login
    if (!validateLoginForm()) return;

    setEmailLoading(true);
    try {
      // Try login first
      const { user } = await authApi.login({ email: email.trim(), password });
      haptic('medium');
      onLogin(user, 'email');
    } catch (loginError: unknown) {
      const apiError = loginError as { response?: { status?: number; data?: { error?: string; message?: string } } };
      const errorMsg = apiError.response?.data?.message || apiError.response?.data?.error || '';

      // Check if user registered with Google (400 Bad Request with specific message)
      if (apiError.response?.status === 400 && errorMsg.toLowerCase().includes('google')) {
        haptic('heavy');
        setError(t('useGoogleSignIn'));
      } else if (apiError.response?.status === 401) {
        // User doesn't exist or wrong password - try register if we have name
        if (name.trim()) {
          if (!validateRegisterForm()) {
            setEmailLoading(false);
            return;
          }
          try {
            const { user } = await authApi.register({
              name: name.trim(),
              email: email.trim(),
              password
            });
            haptic('medium');
            onLogin(user, 'email');
          } catch (registerError: unknown) {
            haptic('heavy');
            const regError = registerError as { response?: { status?: number; data?: { message?: string; error?: string } } };
            const regErrorMsg = regError.response?.data?.message || regError.response?.data?.error;

            // If email already exists (409 conflict), it means wrong password for existing user
            if (regError.response?.status === 409 ||
                regErrorMsg?.toLowerCase().includes('already exists') ||
                regErrorMsg?.toLowerCase().includes('already registered')) {
              setError(t('wrongPassword'));
            } else {
              setError(t('unknownError'));
            }
          }
        } else {
          // No name provided, so it's a wrong password for existing user
          haptic('heavy');
          setError(t('wrongPassword'));
        }
      } else {
        haptic('heavy');
        setError(t('unknownError'));
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
    } catch {
      haptic('heavy');
      setError(t('unknownError'));
    } finally {
      setGoogleLoading(false);
    }
  }, [onLogin, t]);

  const handleGoogleError = useCallback(() => {
    haptic('heavy');
    setError(t('unknownError'));
    setGoogleLoading(false);
  }, [t]);

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
