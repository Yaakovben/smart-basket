import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, Paper, Collapse
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useGoogleLogin } from '@react-oauth/google';
import type { User } from '../../../global/types';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../hooks/useAuth';
import { getPasswordStrength } from '../helpers/auth-helpers';

// ===== לוגו האפליקציה =====
const AppLogo = () => (
  <svg width="56" height="56" viewBox="0 0 64 64">
    <g fill="white">
      <path d="M18 26 L22 44 C22 46 23 47 25 47 L39 47 C41 47 42 46 42 44 L46 26 Z" opacity="0.95"/>
      <path d="M22 26 C22 26 22 20 32 20 C42 20 42 26 42 26" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M26 32 L30 36 L38 28" stroke="#14B8A6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

// ===== לוגו Google =====
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// ===== ממשק Props =====
interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginComponent = ({ onLogin }: LoginPageProps) => {
  const { t } = useSettings();

  const {
    name, email, password, error, googleLoading, emailLoading, isNewUser, showEmailForm, emailSuggestion,
    emailChecked, isGoogleAccount, checkingEmail,
    setName,
    handleEmailChange, handlePasswordChange, handleSubmit, handleGoogleSuccess, handleGoogleError,
    toggleEmailForm, applySuggestion
  } = useAuth({ onLogin });

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError
  });

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
            boxShadow: '0 12px 32px rgba(20, 184, 166, 0.3)'
          }}>
            <AppLogo />
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
          {/* Google Login Button */}
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
              bgcolor: 'background.paper',
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
              '&:hover': { bgcolor: 'action.hover', borderColor: 'divider', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
              '&:active': { bgcolor: 'action.selected' }
            }}
          >
            {googleLoading ? (
              <CircularProgress size={20} sx={{ color: 'text.secondary' }} />
            ) : (
              <>
                <GoogleLogo />
                <span>{t('continueWithGoogle')}</span>
              </>
            )}
          </Button>

          {error && !showEmailForm && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '10px', fontSize: 13 }} icon={<span aria-hidden="true">⚠️</span>} role="alert" aria-live="assertive">
              {error.includes('/clear-cache') ? (
                <span>
                  {error.replace('/clear-cache', '')}
                  <a href="/clear-cache" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>/clear-cache</a>
                </span>
              ) : error}
            </Alert>
          )}

          {/* Email Login Toggle */}
          <Box
            onClick={toggleEmailForm}
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
            <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <TextField
                  fullWidth
                  type="email"
                  label={t('email')}
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  size="small"
                  disabled={emailChecked && !isGoogleAccount}
                  sx={{ mb: (emailSuggestion && !emailChecked) ? 0.5 : 2, mt: 2 }}
                  inputProps={{ dir: 'ltr' }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: 16 }}>📧</Box></InputAdornment>,
                    endAdornment: checkingEmail ? (
                      <InputAdornment position="end">
                        <CircularProgress size={18} sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ) : emailChecked && !isGoogleAccount ? (
                      <InputAdornment position="end">
                        <Box
                          onClick={() => handleEmailChange('')}
                          sx={{ cursor: 'pointer', fontSize: 14, color: 'primary.main' }}
                        >
                          {t('change')}
                        </Box>
                      </InputAdornment>
                    ) : undefined
                  }}
                />

                {/* Email Suggestion */}
                {emailSuggestion && !emailChecked && (
                  <Box
                    onClick={applySuggestion}
                    sx={{
                      mb: 2,
                      p: 1,
                      bgcolor: 'warning.light',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      '&:hover': { bgcolor: 'warning.main' }
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: 'warning.dark' }}>
                      {t('didYouMean')} <strong style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{email.split('@')[0]}@{emailSuggestion}</strong>?
                    </Typography>
                  </Box>
                )}

                {/* Name Field - For new users, shown between email and password */}
                <Collapse in={emailChecked && isNewUser}>
                  <TextField
                    fullWidth
                    label={t('name')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('name')}
                    autoComplete="name"
                    size="small"
                    autoFocus
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: 16 }}>👤</Box></InputAdornment>
                    }}
                  />
                </Collapse>

                {/* Password Field - Always visible */}
                <TextField
                  fullWidth
                  type="password"
                  label={t('password')}
                  value={password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isNewUser ? 'new-password' : 'current-password'}
                  size="small"
                  disabled={isGoogleAccount}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Box sx={{ fontSize: 16 }}>🔒</Box></InputAdornment>
                  }}
                />

                {/* Password Strength Indicator - Only for new users */}
                <Collapse in={isNewUser && password.length > 0}>
                  {(() => {
                    const strength = getPasswordStrength(password, t);
                    const colors = ['#EF4444', '#F59E0B', '#10B981'];
                    return (
                      <Box sx={{
                        mt: -1,
                        mb: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'action.disabledBackground',
                        overflow: 'hidden'
                      }}>
                        <Box sx={{
                          height: '100%',
                          width: `${(strength.strength / 3) * 100}%`,
                          bgcolor: colors[strength.strength - 1] || 'transparent',
                          borderRadius: 2,
                          transition: 'width 0.3s ease, background-color 0.3s ease'
                        }} />
                      </Box>
                    );
                  })()}
                </Collapse>

                {error && showEmailForm && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: '10px', fontSize: 12 }} icon={<span aria-hidden="true">⚠️</span>} role="alert" aria-live="assertive">
                    {error.includes('/clear-cache') ? (
                      <span>
                        {error.replace('/clear-cache', '')}
                        <a href="/clear-cache" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>/clear-cache</a>
                      </span>
                    ) : error}
                  </Alert>
                )}

                {/* Status text for existing users - between password and button */}
                <Collapse in={emailChecked && !isNewUser && !isGoogleAccount}>
                  <Box sx={{
                    mt: 2,
                    py: 1,
                    px: 1.5,
                    bgcolor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75
                  }}>
                    <Box sx={{ fontSize: 14, opacity: 0.8 }}>👋</Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 400 }}>
                      {t('returningUserHint')}
                    </Typography>
                  </Box>
                </Collapse>

                {/* Status text for new users - between password and button */}
                <Collapse in={emailChecked && isNewUser}>
                  <Box sx={{
                    mt: 2,
                    py: 1,
                    px: 1.5,
                    bgcolor: 'rgba(20, 184, 166, 0.08)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75
                  }}>
                    <Box sx={{ fontSize: 14, opacity: 0.8 }}>✨</Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 400 }}>
                      {t('newUserHint')}
                    </Typography>
                  </Box>
                </Collapse>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={emailLoading || isGoogleAccount || checkingEmail}
                  sx={{ mt: 2.5, py: 1.5, fontSize: 15, fontWeight: 600, borderRadius: '12px' }}
                >
                  {emailLoading ? (
                    <CircularProgress size={20} sx={{ color: 'white' }} />
                  ) : isNewUser ? (
                    t('register')
                  ) : (
                    t('login')
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
