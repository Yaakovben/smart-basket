import { useState } from 'react';
import {
  Box, TextField, Button, Typography, Tabs, Tab, Alert,
  LinearProgress, CircularProgress, InputAdornment, Paper
} from '@mui/material';
import type { User } from '../../../global/types';
import { haptic } from '../../../global/helpers';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginComponent = ({ onLogin }: LoginPageProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, text: '', color: '' };
    if (pwd.length < 4) return { strength: 33, text: 'חלשה', color: '#EF4444' };
    if (pwd.length < 6) return { strength: 66, text: 'בינונית', color: '#F59E0B' };
    return { strength: 100, text: 'חזקה', color: '#10B981' };
  };

  const handleLogin = () => {
    setError('');
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      const user = users.find((u: User) => u.email === email && u.password === password);
      if (user) { haptic('medium'); onLogin(user); }
      else { haptic('heavy'); setError('אימייל או סיסמה שגויים'); setLoading(false); }
    }, 500);
  };

  const handleRegister = () => {
    setError('');
    if (!name.trim()) { setError('נא להזין שם'); return; }
    if (name.trim().length < 2) { setError('שם חייב להכיל לפחות 2 תווים'); return; }
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }
    if (password.length < 4) { setError('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    if (!confirm) { setError('נא לאמת את הסיסמה'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      if (users.find((u: User) => u.email === email)) {
        haptic('heavy'); setError('אימייל זה כבר קיים במערכת'); setLoading(false); return;
      }
      const newUser = { id: `u${Date.now()}`, name: name.trim(), email, password };
      users.push(newUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(newUser);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    mode === 'login' ? handleLogin() : handleRegister();
  };

  const pwdStrength = mode === 'register' ? getPasswordStrength(password) : null;

  return (
    <Box sx={{
      minHeight: { xs: '100dvh', sm: '100vh' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
      p: { xs: 2, sm: 2.5 },
      pt: 'max(20px, env(safe-area-inset-top))',
      pb: 'max(20px, env(safe-area-inset-bottom))'
    }}>
      <Paper sx={{
        width: '100%',
        maxWidth: 440,
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '@keyframes scaleIn': {
          from: { transform: 'scale(0.95)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 }
        }
      }}>
        {/* Header */}
        <Box sx={{ flexShrink: 0, p: 4, pb: 2.5, textAlign: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)'
          }}>
            <Typography sx={{ fontSize: 40 }}>🛒</Typography>
          </Box>
          <Typography variant="h1" sx={{ mb: 0.75, color: '#111827' }}>SmartBasket</Typography>
          <Typography color="text.secondary" sx={{ fontSize: 14 }}>רשימות קניות חכמות ומשותפות</Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ flexShrink: 0, px: 4, pt: 2.5 }}>
          <Tabs
            value={mode}
            onChange={(_, v) => { setMode(v); setError(''); }}
            variant="fullWidth"
            sx={{
              bgcolor: '#F3F4F6',
              borderRadius: '12px',
              p: 0.5,
              minHeight: 'auto',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                borderRadius: '10px',
                py: 1.5,
                minHeight: 'auto',
                fontWeight: 600,
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  color: 'primary.main',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }
              }
            }}
          >
            <Tab value="login" label="התחברות" />
            <Tab value="register" label="הרשמה" />
          </Tabs>
        </Box>

        {/* Form */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 3, minHeight: 0 }}>
          <form onSubmit={handleSubmit} id="auth-form">
            {mode === 'register' && (
              <TextField
                fullWidth
                label="שם מלא"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="הזן את שמך המלא"
                autoComplete="name"
                disabled={loading}
                sx={{ mb: 2.5 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">👤</InputAdornment>
                }}
              />
            )}

            <TextField
              fullWidth
              type="email"
              label="אימייל"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@mail.com"
              autoComplete="email"
              disabled={loading}
              sx={{ mb: 2.5 }}
              inputProps={{ dir: 'ltr' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">📧</InputAdornment>
              }}
            />

            <TextField
              fullWidth
              type="password"
              label="סיסמה"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
              sx={{ mb: mode === 'register' ? 0 : 0 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">🔒</InputAdornment>
              }}
            />

            {mode === 'register' && password && pwdStrength && (
              <Box sx={{ mt: 1.25, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <LinearProgress
                  variant="determinate"
                  value={pwdStrength.strength}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: '4px',
                    bgcolor: '#E5E7EB',
                    '& .MuiLinearProgress-bar': { bgcolor: pwdStrength.color }
                  }}
                />
                <Typography sx={{ fontSize: 13, color: pwdStrength.color, fontWeight: 600 }}>
                  {pwdStrength.text}
                </Typography>
              </Box>
            )}

            {mode === 'register' && (
              <TextField
                fullWidth
                type="password"
                label="אימות סיסמה"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
                sx={{ mt: password ? 0 : 2.5 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">🔑</InputAdornment>
                }}
              />
            )}
          </form>
        </Box>

        {/* Footer */}
        <Box sx={{ flexShrink: 0, px: 4, pb: 4, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} icon={<span>⚠️</span>}>
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
              py: 2,
              fontSize: 16,
              fontWeight: 700,
              borderRadius: '12px',
              ...(loading && { bgcolor: '#9CA3AF', boxShadow: 'none' })
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <CircularProgress size={20} sx={{ color: 'white' }} />
                <span>טוען...</span>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <span>{mode === 'login' ? 'התחבר' : 'הרשם'}</span>
                <span>←</span>
              </Box>
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
