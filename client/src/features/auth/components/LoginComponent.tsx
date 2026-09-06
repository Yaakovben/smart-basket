import { memo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useGoogleLogin } from '@react-oauth/google';
import type { User } from '../../../global/types';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../hooks/useAuth';
import { useClearCache } from '../hooks/useClearCache';
import { AppLogo } from './LoginLogos';
import { GoogleSignInButton } from './GoogleSignInButton';
import { LoginErrorAlert } from './LoginErrorAlert';
import { EmailLoginToggle } from './EmailLoginToggle';
import { EmailLoginForm } from './EmailLoginForm';

// ===== ממשק Props =====
interface LoginPageProps {
  onLogin: (user: User) => void;
}

// memo - LoginComponent מקבל onLogin מהראוטר. כשהראוטר re-renders עקב
// presence/notifications, אם onLogin שמור (useCallback ב-handleLogin),
// LoginComponent לא יעשה re-render. מונע פליקור של Google OAuth widget.
const LoginComponentImpl = ({ onLogin }: LoginPageProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const { clearing, handleClearCache } = useClearCache();

  const auth = useAuth({ onLogin });
  const { error, googleLoading, showEmailForm, handleGoogleSuccess, handleGoogleError, toggleEmailForm } = auth;

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError
  });

  return (
    <Box sx={{
      height: { xs: 'var(--app-height, 100dvh)', sm: '100vh' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0F1419 0%, #1A2332 100%)'
        : 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
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
        boxShadow: isDark
          ? '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
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
            background: '#0D9488',
            borderRadius: { xs: '22px', sm: '24px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: { xs: 2.5, sm: 3 },
            boxShadow: '0 12px 32px rgba(13, 148, 136, 0.35)'
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
          <GoogleSignInButton loading={googleLoading} onClick={() => googleLogin()} t={t} />

          {error && !showEmailForm && (
            <LoginErrorAlert error={error} clearing={clearing} onClearCache={handleClearCache} onDismiss={() => auth.setError('')} t={t} fontSize={13} />
          )}

          {/* Email Login Toggle */}
          <EmailLoginToggle showEmailForm={showEmailForm} onToggle={toggleEmailForm} t={t} />

          {/* Collapsible Email Form */}
          <EmailLoginForm open={showEmailForm} auth={auth} clearing={clearing} onClearCache={handleClearCache} t={t} />
        </Box>
      </Paper>
    </Box>
  );
};

export const LoginComponent = memo(LoginComponentImpl);
LoginComponent.displayName = 'LoginComponent';
