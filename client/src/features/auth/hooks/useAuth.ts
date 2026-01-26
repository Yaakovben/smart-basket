import { useState, useCallback } from 'react';
import type { User } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { StorageService } from '../../../global/services/storage';
import { isValidEmail } from '../helpers/auth-helpers';
import type { UseAuthReturn, GoogleUserInfo } from '../types/auth-types';
import { loginSchema, registerSchema, validateForm } from '../../../global/validation';

// ===== Constants =====
const GOOGLE_API_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const DEFAULT_AVATAR_COLOR = '#14B8A6';
const GOOGLE_AVATAR_COLOR = '#4285F4';

// ===== Types =====
interface UseAuthParams {
  onLogin: (user: User) => void;
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
  const [isNewUser, setIsNewUser] = useState(false);

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
  const checkEmailExists = useCallback((emailToCheck: string) => {
    if (!isValidEmail(emailToCheck)) return;
    const users = StorageService.getUsers();
    const exists = users.some((u: User) => u.email === emailToCheck);
    setIsNewUser(!exists);
  }, []);

  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    checkEmailExists(newEmail);
  }, [checkEmailExists]);

  const handleLogin = useCallback((existingUser: User) => {
    if (existingUser.password === password) {
      haptic('medium');
      onLogin(existingUser);
    } else {
      haptic('heavy');
      setError(t('wrongPassword'));
    }
  }, [password, onLogin, t]);

  const handleRegister = useCallback((users: User[]) => {
    if (!validateRegisterForm()) return;

    const newUser: User = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email,
      password,
      avatarEmoji: '',
      avatarColor: DEFAULT_AVATAR_COLOR
    };

    users.push(newUser);
    StorageService.setUsers(users);
    haptic('medium');
    onLogin(newUser);
  }, [name, email, password, onLogin, validateRegisterForm]);

  const handleEmailSubmit = useCallback(() => {
    setError('');
    if (!validateLoginForm()) return;

    const users = StorageService.getUsers();
    const existingUser = users.find((u: User) => u.email === email);

    if (existingUser) {
      handleLogin(existingUser);
    } else {
      handleRegister(users);
    }
  }, [email, validateLoginForm, handleLogin, handleRegister]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleEmailSubmit();
  }, [handleEmailSubmit]);

  // ===== Google Auth Handlers =====
  const handleGoogleSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
    setGoogleLoading(true);
    try {
      const response = await fetch(GOOGLE_API_URL, {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const userInfo: GoogleUserInfo = await response.json();

      haptic('medium');
      const users = StorageService.getUsers();

      // Check for existing user
      const existingUser = users.find((u: User) => u.email === userInfo.email);
      if (existingUser) {
        onLogin(existingUser);
        return;
      }

      // Create new Google user
      const googleUser: User = {
        id: `g${userInfo.sub}`,
        name: userInfo.name,
        email: userInfo.email,
        avatarEmoji: '',
        avatarColor: GOOGLE_AVATAR_COLOR
      };

      users.push(googleUser);
      StorageService.setUsers(users);
      onLogin(googleUser);
    } catch {
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
    isNewUser,
    showEmailForm,

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
    isValidEmail
  };
};
