import { useState, useCallback } from 'react';
import type { User } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { isValidEmail } from '../helpers/auth-helpers';
import type { UseAuthReturn, GoogleUserInfo } from '../types/auth-types';

interface UseAuthParams {
  onLogin: (user: User) => void;
}

export const useAuth = ({ onLogin }: UseAuthParams): UseAuthReturn => {
  const { t } = useSettings();

  // ===== State =====
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // ===== Handlers =====
  const checkEmailExists = useCallback((emailToCheck: string) => {
    if (!isValidEmail(emailToCheck)) return;
    const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
    const exists = users.some((u: User) => u.email === emailToCheck);
    setIsNewUser(!exists);
  }, []);

  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail);
    checkEmailExists(newEmail);
  }, [checkEmailExists]);

  const handleGoogleSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
    setGoogleLoading(true);
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const userInfo: GoogleUserInfo = await response.json();

      haptic('medium');
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');

      const existingUser = users.find((u: User) => u.email === userInfo.email);
      if (existingUser) {
        onLogin(existingUser);
        return;
      }

      const googleUser: User = {
        id: `g${userInfo.sub}`,
        name: userInfo.name,
        email: userInfo.email,
        avatarEmoji: '',
        avatarColor: '#4285F4'
      };

      users.push(googleUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      onLogin(googleUser);
    } catch (err) {
      console.error('Error fetching Google user info:', err);
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

  const handleEmailSubmit = useCallback(() => {
    setError('');
    if (!email.trim()) {
      setError(t('enterEmail') || 'נא להזין אימייל');
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('invalidEmail') || 'אימייל לא תקין');
      return;
    }
    if (!password) {
      setError(t('enterPassword') || 'נא להזין סיסמה');
      return;
    }

    const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
    const existingUser = users.find((u: User) => u.email === email);

    if (existingUser) {
      // Login
      if (existingUser.password === password) {
        haptic('medium');
        onLogin(existingUser);
      } else {
        haptic('heavy');
        setError(t('wrongPassword'));
      }
    } else {
      // Register
      if (!name.trim()) {
        setError(t('enterName') || 'נא להזין שם');
        return;
      }
      if (name.trim().length < 2) {
        setError(t('nameTooShort'));
        return;
      }
      if (password.length < 4) {
        setError(t('passwordTooShort') || 'סיסמה חייבת להכיל לפחות 4 תווים');
        return;
      }

      const newUser: User = {
        id: `u${Date.now()}`,
        name: name.trim(),
        email,
        password,
        avatarEmoji: '',
        avatarColor: '#14B8A6'
      };
      users.push(newUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(newUser);
    }
  }, [email, password, name, onLogin, t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleEmailSubmit();
  }, [handleEmailSubmit]);

  const toggleEmailForm = useCallback(() => {
    setShowEmailForm(prev => !prev);
    setError('');
  }, []);

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
