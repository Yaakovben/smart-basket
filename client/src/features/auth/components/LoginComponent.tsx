import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, Button, Typography, Tabs, Tab, Alert,
  LinearProgress, CircularProgress, InputAdornment, Paper, Divider, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import type { User } from '../../../global/types';
import { haptic, SIZES } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const LoginComponent = ({ onLogin }: LoginPageProps) => {
  const { t } = useSettings();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState('');

  const isValidEmail = useCallback((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), []);

  const pwdStrength = useMemo(() => {
    if (mode !== 'register' || password.length === 0) return null;
    if (password.length < 4) return { strength: 33, color: '#EF4444' };
    if (password.length < 6) return { strength: 66, color: '#F59E0B' };
    return { strength: 100, color: '#10B981' };
  }, [mode, password]);

  const handleLogin = useCallback(() => {
    setError('');
    if (!email.trim()) { setError(t('enterProductName').replace('מוצר', 'אימייל')); return; }
    if (!isValidEmail(email)) { setError(t('unknownError')); return; }
    if (!password) { setError(t('password') + ' ' + t('enterListName').slice(-5)); return; }

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
    if (!name.trim()) { setError(t('enterListName')); return; }
    if (name.trim().length < 2) { setError(t('nameTooShort')); return; }
    if (!email.trim()) { setError(t('enterListName')); return; }
    if (!isValidEmail(email)) { setError(t('unknownError')); return; }
    if (!password) { setError(t('enterListName')); return; }
    if (password.length < 4) { setError(t('nameTooShort')); return; }
    if (!confirm) { setError(t('enterListName')); return; }
    if (password !== confirm) { setError(t('wrongPassword')); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      if (users.find((u: User) => u.email === email)) {
        haptic('heavy'); setError(t('alreadyInGroup')); setLoading(false); return;
      }
      const newUser = { id: `u${Date.now()}`, name: name.trim(), email, password };
      users.push(newUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(newUser);
    }, 500);
  }, [name, email, password, confirm, isValidEmail, onLogin, t]);

  const handleGoogleLogin = useCallback(() => {
    haptic('light');
    setShowGoogleForm(true);
    setGoogleName('');
    setGoogleEmail('');
    setGoogleError('');
  }, []);

  const handleGoogleSubmit = useCallback(() => {
    setGoogleError('');
    if (!googleName.trim()) { setGoogleError(t('enterListName')); return; }
    if (googleName.trim().length < 2) { setGoogleError(t('nameTooShort')); return; }
    if (!googleEmail.trim()) { setGoogleError(t('enterListName')); return; }
    if (!isValidEmail(googleEmail)) { setGoogleError(t('unknownError')); return; }

    setGoogleLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');

      // Check if email already exists
      const existingUser = users.find((u: User) => u.email === googleEmail);
      if (existingUser) {
        haptic('medium');
        onLogin(existingUser);
        setShowGoogleForm(false);
        setGoogleLoading(false);
        return;
      }

      const googleUser = {
        id: `g${Date.now()}`,
        name: googleName.trim(),
        email: googleEmail.trim(),
        avatarEmoji: '',
        avatarColor: '#4285F4'
      };

      users.push(googleUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      setShowGoogleForm(false);
      setGoogleLoading(false);
      onLogin(googleUser);
    }, 800);
  }, [googleName, googleEmail, isValidEmail, onLogin, t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    mode === 'login' ? handleLogin() : handleRegister();
  }, [loading, googleLoading, mode, handleLogin, handleRegister]);

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
          <Button
            fullWidth
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            sx={{
              mb: 2.5,
              py: 1.5,
              borderRadius: SIZES.radius.md,
              border: '2px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary',
              fontWeight: 600,
              fontSize: SIZES.text.md,
              textTransform: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'text.secondary'
              }
            }}
          >
            {googleLoading ? (
              <CircularProgress size={20} sx={{ color: '#4285F4' }} />
            ) : (
              <GoogleIcon />
            )}
            <span>{mode === 'login' ? `${t('login')} Google` : `${t('register')} Google`}</span>
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 2.5 }}>
            <Typography sx={{ fontSize: SIZES.text.xs, color: 'text.secondary', px: 1 }}>או</Typography>
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
                disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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
                disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
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

      {/* Google Login Form Dialog */}
      <Dialog
        open={showGoogleForm}
        onClose={() => !googleLoading && setShowGoogleForm(false)}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            maxWidth: 400,
            width: '90%',
            m: 2
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '14px',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5
          }}>
            <GoogleIcon />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary' }}>
            {t('login')} Google
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            {t('shareDetails')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3, pt: 1 }}>
          {googleError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md, fontSize: SIZES.text.sm }} icon={<span>⚠️</span>}>
              {googleError}
            </Alert>
          )}
          <TextField
            fullWidth
            label={t('name')}
            value={googleName}
            onChange={e => setGoogleName(e.target.value)}
            placeholder={t('name')}
            disabled={googleLoading}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: SIZES.emoji.sm }}>👤</Box></InputAdornment>
            }}
          />
          <TextField
            fullWidth
            type="email"
            label={`${t('email')} Google`}
            value={googleEmail}
            onChange={e => setGoogleEmail(e.target.value)}
            placeholder="example@gmail.com"
            disabled={googleLoading}
            sx={{ mb: 2.5 }}
            inputProps={{ dir: 'ltr' }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: SIZES.emoji.sm }}>📧</Box></InputAdornment>
            }}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() => setShowGoogleForm(false)}
              disabled={googleLoading}
              sx={{ flex: 1, borderRadius: SIZES.radius.md }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleGoogleSubmit}
              disabled={googleLoading}
              sx={{ flex: 2, borderRadius: SIZES.radius.md }}
            >
              {googleLoading ? (
                <CircularProgress size={18} sx={{ color: 'white' }} />
              ) : (
                t('confirm')
              )}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
