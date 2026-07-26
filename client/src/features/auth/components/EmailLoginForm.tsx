import { Box, TextField, Typography, Button, CircularProgress, InputAdornment, Collapse } from '@mui/material';
import { ClearableTextField } from '../../../global/components';
import { getPasswordStrength } from '../helpers/auth-helpers';
import { LoginErrorAlert } from './LoginErrorAlert';
import type { UseAuthReturn } from '../types/auth-types';
import type { TranslationKeys } from '../../../global/i18n/translations';

interface EmailLoginFormProps {
  open: boolean;
  auth: UseAuthReturn;
  clearing: boolean;
  onClearCache: () => void;
  t: (key: TranslationKeys) => string;
}

// טופס התחברות/הרשמה באימייל - מתקפל מתחת לכפתור "התחברות ללא Google".
export const EmailLoginForm = ({ open, auth, clearing, onClearCache, t }: EmailLoginFormProps) => {
  const {
    name, email, password, error, emailLoading, slowSubmit, isNewUser, emailSuggestion,
    emailChecked, isGoogleAccount, checkingEmail,
    setName, handleEmailChange, handlePasswordChange, handleSubmit, applySuggestion
  } = auth;

  return (
    <Collapse in={open}>
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
            <ClearableTextField
              fullWidth
              label={t('name')}
              value={name}
              onChange={e => setName(e.target.value)}
              onClear={() => setName('')}
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
          <ClearableTextField
            fullWidth
            type="password"
            label={t('password')}
            value={password}
            onChange={e => handlePasswordChange(e.target.value)}
            onClear={() => handlePasswordChange('')}
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

          {error && open && (
            <LoginErrorAlert error={error} clearing={clearing} onClearCache={onClearCache} t={t} fontSize={12} />
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

          {/* מוצג רק אם emailLoading נמשך יותר מכמה שניות - מונע תחושה שהכפתור "תקוע" */}
          <Collapse in={emailLoading && slowSubmit}>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
              {t('slowConnectionHint')}
            </Typography>
          </Collapse>
        </form>
      </Box>
    </Collapse>
  );
};
