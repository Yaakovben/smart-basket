import { useState, useCallback } from 'react';
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, Paper, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import type { User } from '../../../global/types';
import { haptic, SIZES } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

interface GoogleUserInfo {
  name: string;
  email: string;
  picture?: string;
  sub: string;
}

// Google Logo SVG
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const LoginComponent = ({ onLogin }: LoginPageProps) => {
  const { t } = useSettings();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const isValidEmail = useCallback((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), []);

  // Check if email exists when user finishes typing
  const checkEmailExists = useCallback((emailToCheck: string) => {
    if (!isValidEmail(emailToCheck)) return;
    const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
    const exists = users.some((u: User) => u.email === emailToCheck);
    setIsNewUser(!exists);
  }, [isValidEmail]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        // Fetch user info from Google
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userInfo = await response.json();

        haptic('medium');
        const users = JSON.parse(localStorage.getItem('sb_users') || '[]');

        // Check if user already exists
        const existingUser = users.find((u: User) => u.email === userInfo.email);
        if (existingUser) {
          onLogin(existingUser);
          return;
        }

        // Create new user from Google data
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
    },
    onError: () => {
      haptic('heavy');
      setError(t('unknownError'));
      setGoogleLoading(false);
    }
  });

  const handleEmailSubmit = useCallback(() => {
    setError('');
    if (!email.trim()) { setError(t('enterEmail') || 'נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError(t('invalidEmail') || 'אימייל לא תקין'); return; }
    if (!password) { setError(t('enterPassword') || 'נא להזין סיסמה'); return; }

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
      if (!name.trim()) { setError(t('enterName') || 'נא להזין שם'); return; }
      if (name.trim().length < 2) { setError(t('nameTooShort')); return; }
      if (password.length < 4) { setError(t('passwordTooShort') || 'סיסמה חייבת להכיל לפחות 4 תווים'); return; }

      const newUser = {
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
  }, [email, password, name, isValidEmail, onLogin, t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    handleEmailSubmit();
  }, [loading, handleEmailSubmit]);

  return (
    <Box sx={{
      height: { xs: '100dvh', sm: '100vh' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
      p: { xs: 2, sm: 2.5 },
      pt: 'max(20px, env(safe-area-inset-top))',
      pb: 'max(20px, env(safe-area-inset-bottom))',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <Paper sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 400 },
        borderRadius: { xs: '24px', sm: '28px' },
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '@keyframes scaleIn': {
          from: { transform: 'scale(0.95)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 }
        }
      }}>
        {/* Header */}
        <Box sx={{ p: { xs: 4, sm: 5 }, pb: { xs: 3, sm: 3.5 }, textAlign: 'center' }}>
          <Box sx={{
            width: { xs: 80, sm: 88 },
            height: { xs: 80, sm: 88 },
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: { xs: '22px', sm: '24px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: { xs: 2.5, sm: 3 },
            boxShadow: '0 12px 32px rgba(20, 184, 166, 0.3)',
            fontSize: { xs: 40, sm: 48 }
          }}>
            🛒
          </Box>
          <Typography sx={{ mb: 1, color: 'text.primary', fontSize: { xs: 24, sm: 28 }, fontWeight: 700 }}>
            {t('appName')}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 14, sm: 15 }, lineHeight: 1.5 }}>
            {t('aboutDescription')}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ px: { xs: 3, sm: 4 }, pb: { xs: 4, sm: 5 } }}>
          {/* Google Login Button - Professional Style */}
          <Button
            fullWidth
            onClick={() => googleLogin()}
            disabled={googleLoading}
            sx={{
              py: 1.5,
              px: 3,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'white',
              color: 'text.primary',
              fontSize: 15,
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: '#F8F9FA',
                borderColor: '#DADCE0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              },
              '&:active': {
                bgcolor: '#F1F3F4'
              }
            }}
          >
            {googleLoading ? (
              <CircularProgress size={20} sx={{ color: 'text.secondary' }} />
            ) : (
              <>
                <GoogleLogo />
                <span>המשך עם Google</span>
              </>
            )}
          </Button>

          {error && !showEmailForm && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '10px', fontSize: 13 }} icon={<span>⚠️</span>}>
              {error}
            </Alert>
          )}

          {/* Email Login Toggle */}
          <Box
            onClick={() => { setShowEmailForm(!showEmailForm); setError(''); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              py: 2,
              mt: 1,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              transition: 'color 0.2s'
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
              {showEmailForm ? t('hideEmailLogin') : t('loginWithoutGoogle')}
            </Typography>
            {showEmailForm ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
          </Box>

          {/* Collapsible Email Form */}
          <Collapse in={showEmailForm}>
            <Box sx={{
              pt: 1,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}>
              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <TextField
                  fullWidth
                  type="email"
                  label={t('email')}
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    checkEmailExists(e.target.value);
                  }}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  disabled={loading}
                  size="small"
                  sx={{ mb: 2, mt: 2 }}
                  inputProps={{ dir: 'ltr' }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: 16 }}>📧</Box></InputAdornment>
                  }}
                />

                {/* Name Field - Only for new users */}
                <Collapse in={isNewUser && email.length > 0}>
                  <TextField
                    fullWidth
                    label={t('name')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('name')}
                    autoComplete="name"
                    disabled={loading}
                    size="small"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: 16 }}>👤</Box></InputAdornment>
                    }}
                  />
                </Collapse>

                {/* Password Field */}
                <TextField
                  fullWidth
                  type="password"
                  label={t('password')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isNewUser ? 'new-password' : 'current-password'}
                  disabled={loading}
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: 16 }}>🔒</Box></InputAdornment>
                  }}
                />

                {/* Helper text */}
                {email && isValidEmail(email) && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1, textAlign: 'center' }}>
                    {isNewUser ? '👋 משתמש חדש? נרשם אותך אוטומטית' : '👋 שלום שוב! הזן סיסמה להתחברות'}
                  </Typography>
                )}

                {error && showEmailForm && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: '10px', fontSize: 12 }} icon={<span>⚠️</span>}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{
                    mt: 2.5,
                    py: 1.5,
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: '12px'
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                  ) : (
                    isNewUser ? t('register') : t('login')
                  )}
                </Button>
              </form>
            </Box>
          </Collapse>
        </Box>
      </Paper>
    </Box>
  );
};
