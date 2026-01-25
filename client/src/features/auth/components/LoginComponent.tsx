import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, Button, Typography, Tabs, Tab, Alert,
  LinearProgress, CircularProgress, InputAdornment, Paper, Divider
} from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
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

export const LoginComponent = ({ onLogin }: LoginPageProps) => {
  const { t } = useSettings();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = useCallback((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), []);

  const pwdStrength = useMemo(() => {
    if (mode !== 'register' || password.length === 0) return null;
    if (password.length < 4) return { strength: 33, color: '#EF4444' };
    if (password.length < 6) return { strength: 66, color: '#F59E0B' };
    return { strength: 100, color: '#10B981' };
  }, [mode, password]);

  const handleGoogleSuccess = useCallback((credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      try {
        const decoded: GoogleUserInfo = jwtDecode(credentialResponse.credential);
        haptic('medium');

        const users = JSON.parse(localStorage.getItem('sb_users') || '[]');

        // Check if user already exists
        const existingUser = users.find((u: User) => u.email === decoded.email);
        if (existingUser) {
          onLogin(existingUser);
          return;
        }

        // Create new user from Google data
        const googleUser: User = {
          id: `g${decoded.sub}`,
          name: decoded.name,
          email: decoded.email,
          avatarEmoji: '',
          avatarColor: '#4285F4'
        };

        users.push(googleUser);
        localStorage.setItem('sb_users', JSON.stringify(users));
        onLogin(googleUser);
      } catch (err) {
        console.error('Error decoding Google token:', err);
        setError(t('unknownError'));
      }
    }
  }, [onLogin, t]);

  const handleGoogleError = useCallback(() => {
    haptic('heavy');
    setError(t('unknownError'));
  }, [t]);

  const handleLogin = useCallback(() => {
    setError('');
    if (!email.trim()) { setError(t('enterEmail') || 'נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError(t('invalidEmail') || 'אימייל לא תקין'); return; }
    if (!password) { setError(t('enterPassword') || 'נא להזין סיסמה'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      const user = users.find((u: User) => u.email === email && u.password === password);
      if (user) { haptic('medium'); onLogin(user); }
      else { haptic('heavy'); setError(t('wrongPassword')); setLoading(false); }
    }, 500);
  }, [email, password, isValidEmail, onLogin, t]);

  const handleRegister = useCallback(() => {
    setError('');
    if (!name.trim()) { setError(t('enterName') || 'נא להזין שם'); return; }
    if (name.trim().length < 2) { setError(t('nameTooShort')); return; }
    if (!email.trim()) { setError(t('enterEmail') || 'נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError(t('invalidEmail') || 'אימייל לא תקין'); return; }
    if (!password) { setError(t('enterPassword') || 'נא להזין סיסמה'); return; }
    if (password.length < 4) { setError(t('passwordTooShort') || 'סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    if (!confirm) { setError(t('confirmPassword') || 'נא לאמת סיסמה'); return; }
    if (password !== confirm) { setError(t('passwordMismatch') || 'הסיסמאות אינן תואמות'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      if (users.find((u: User) => u.email === email)) {
        haptic('heavy'); setError(t('emailExists') || 'אימייל זה כבר קיים'); setLoading(false); return;
      }
      const newUser = { id: `u${Date.now()}`, name: name.trim(), email, password };
      users.push(newUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(newUser);
    }, 500);
  }, [name, email, password, confirm, isValidEmail, onLogin, t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    mode === 'login' ? handleLogin() : handleRegister();
  }, [loading, mode, handleLogin, handleRegister]);

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
        maxWidth: { xs: '100%', sm: 440 },
        borderRadius: { xs: '20px', sm: '24px' },
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { xs: '95vh', sm: '90vh' },
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '@keyframes scaleIn': {
          from: { transform: 'scale(0.95)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 }
        }
      }}>
        {/* Header */}
        <Box sx={{ flexShrink: 0, p: { xs: 3, sm: 4 }, pb: { xs: 2, sm: 2.5 }, textAlign: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{
            width: { xs: 64, sm: 72 },
            height: { xs: 64, sm: 72 },
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: { xs: '16px', sm: '18px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: { xs: 1.5, sm: 2 },
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)',
            fontSize: { xs: 32, sm: 40 }
          }}>
            🛒
          </Box>
          <Typography variant="h1" sx={{ mb: 0.75, color: 'text.primary', fontSize: SIZES.text.xxl }}>{t('appName')}</Typography>
          <Typography color="text.secondary" sx={{ fontSize: SIZES.text.sm }}>{t('aboutDescription')}</Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ flexShrink: 0, px: { xs: 3, sm: 4 }, pt: { xs: 2, sm: 2.5 } }}>
          <Tabs
            value={mode}
            onChange={(_, v) => { setMode(v); setError(''); }}
            variant="fullWidth"
            sx={{
              bgcolor: 'action.hover',
              borderRadius: SIZES.radius.md,
              p: 0.5,
              minHeight: 'auto',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                borderRadius: SIZES.radius.sm,
                py: 1.5,
                minHeight: 'auto',
                fontWeight: 600,
                fontSize: SIZES.text.sm,
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }
              }
            }}
          >
            <Tab value="login" label={t('login')} />
            <Tab value="register" label={t('register')} />
          </Tabs>
        </Box>

        {/* Form */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 3, sm: 4 }, py: { xs: 2.5, sm: 3 }, minHeight: 0 }}>
          {/* Google Login Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              shape="rectangular"
              size="large"
              text={mode === 'login' ? 'signin_with' : 'signup_with'}
              width="100%"
            />
          </Box>

          {/* Divider */}
          <Divider sx={{ my: 2.5 }}>
            <Typography sx={{ fontSize: SIZES.text.xs, color: 'text.secondary', px: 1 }}>{t('or') || 'או'}</Typography>
          </Divider>

          <form onSubmit={handleSubmit} id="auth-form">
            {mode === 'register' && (
              <TextField
                fullWidth
                label={t('name')}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('name')}
                autoComplete="name"
                disabled={loading}
                sx={{ mb: 2.5 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: SIZES.emoji.sm }}>👤</Box></InputAdornment>
                }}
              />
            )}

            <TextField
              fullWidth
              type="email"
              label={t('email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@mail.com"
              autoComplete="email"
              disabled={loading}
              sx={{ mb: 2.5 }}
              inputProps={{ dir: 'ltr' }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: SIZES.emoji.sm }}>📧</Box></InputAdornment>
              }}
            />

            <TextField
              fullWidth
              type="password"
              label={t('password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: SIZES.emoji.sm }}>🔒</Box></InputAdornment>
              }}
            />

            {pwdStrength && (
              <Box sx={{ mt: 1.25, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <LinearProgress
                  variant="determinate"
                  value={pwdStrength.strength}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: '4px',
                    bgcolor: 'divider',
                    '& .MuiLinearProgress-bar': { bgcolor: pwdStrength.color }
                  }}
                />
              </Box>
            )}

            {mode === 'register' && (
              <TextField
                fullWidth
                type="password"
                label={`${t('confirm')} ${t('password')}`}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                sx={{ mt: password ? 0 : 2.5 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: SIZES.emoji.sm }}>🔑</Box></InputAdornment>
                }}
              />
            )}
          </form>
        </Box>

        {/* Footer */}
        <Box sx={{ flexShrink: 0, px: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 }, pt: { xs: 2, sm: 2.5 }, borderTop: '1px solid', borderColor: 'divider' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md, fontSize: SIZES.text.sm }} icon={<span>⚠️</span>}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            form="auth-form"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              py: 1.75,
              fontSize: SIZES.text.md,
              fontWeight: 700,
              borderRadius: SIZES.radius.md,
              ...(loading && { bgcolor: 'text.secondary', boxShadow: 'none' })
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <CircularProgress size={18} sx={{ color: 'white' }} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <span>{mode === 'login' ? t('login') : t('register')}</span>
                <span>←</span>
              </Box>
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
