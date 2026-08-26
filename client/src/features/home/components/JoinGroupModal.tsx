import type { RefObject } from 'react';
import { Box, Typography, TextField, Button, InputAdornment, Alert, CircularProgress } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { Modal } from '../../../global/components';
import { checkmarkPopKeyframes, shakeKeyframes } from '../helpers/homeStyles';

interface JoinGroupModalProps {
  joinCode: string;
  joinPass: string;
  joinError: string;
  joinCooldown: number;
  joiningGroup: boolean;
  passwordInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onCodeChange: (code: string) => void;
  onPassChange: (pass: string) => void;
  onClearError: () => void;
  onSubmit: () => void;
  onOpenQRScanner: () => void;
  t: (key: TranslationKeys) => string;
}

export const JoinGroupModal = ({
  joinCode, joinPass, joinError, joinCooldown, joiningGroup, passwordInputRef,
  onClose, onCodeChange, onPassChange, onClearError, onSubmit, onOpenQRScanner, t,
}: JoinGroupModalProps) => {
  return (
    <Modal title={t('joinGroup')} onClose={() => !joiningGroup && onClose()}>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Box sx={{
          width: 56,
          height: 56,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #14B8A6, #10B981)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          mx: 'auto',
          mb: 1.5,
          boxShadow: '0 6px 16px rgba(20, 184, 166, 0.25)'
        }}>
          <PersonAddIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', lineHeight: 1.5 }}>
          {t('enterCodeAndPasswordHint')}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('groupCode')}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('sixChars')}</Typography>
        </Box>
        <TextField
          fullWidth
          value={joinCode}
          onChange={e => { onCodeChange(e.target.value.toUpperCase().slice(0, 6)); onClearError(); }}
          placeholder="_ _ _ _ _ _"
          size="small"
          inputProps={{ maxLength: 6, dir: 'ltr', style: { textAlign: 'left', textTransform: 'uppercase', letterSpacing: 12, fontWeight: 700, fontSize: 20, paddingLeft: 16 } }}
          sx={{
            ...shakeKeyframes,
            animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: joinError ? 'rgba(239,68,68,0.1)' : 'action.hover',
              transition: 'all 0.2s',
              '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
              '&.Mui-focused': { bgcolor: 'background.paper' },
              '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
            }
          }}
          InputProps={{
            startAdornment: joinError ? (
              <InputAdornment position="start">
                <Box
                  onClick={() => { onCodeChange(''); onClearError(); }}
                  sx={{ color: '#EF4444', fontSize: 18, fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                >✕</Box>
              </InputAdornment>
            ) : joinCode.length === 6 ? (
              <InputAdornment position="start">
                <Box sx={{
                  color: 'success.main',
                  fontSize: 18,
                  fontWeight: 700,
                  animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  ...checkmarkPopKeyframes
                }}>✓</Box>
              </InputAdornment>
            ) : null
          }}
        />
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('password')}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('fourDigits')}</Typography>
        </Box>
        <TextField
          fullWidth
          value={joinPass}
          onChange={e => { onPassChange(e.target.value.replace(/\D/g, '').slice(0, 4)); onClearError(); }}
          placeholder="_ _ _ _"
          size="small"
          inputRef={passwordInputRef}
          inputProps={{ maxLength: 4, inputMode: 'numeric', dir: 'ltr', style: { textAlign: 'left', letterSpacing: 16, fontWeight: 700, fontSize: 20, paddingLeft: 16 } }}
          sx={{
            ...shakeKeyframes,
            animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: joinError ? 'rgba(239,68,68,0.1)' : 'action.hover',
              transition: 'all 0.2s',
              '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
              '&.Mui-focused': { bgcolor: 'background.paper' },
              '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
            }
          }}
          InputProps={{
            startAdornment: joinError ? (
              <InputAdornment position="start">
                <Box
                  onClick={() => { onPassChange(''); onClearError(); }}
                  sx={{ color: '#EF4444', fontSize: 18, fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                >✕</Box>
              </InputAdornment>
            ) : joinPass.length === 4 ? (
              <InputAdornment position="start">
                <Box sx={{
                  color: 'success.main',
                  fontSize: 18,
                  fontWeight: 700,
                  animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  ...checkmarkPopKeyframes
                }}>✓</Box>
              </InputAdornment>
            ) : null
          }}
        />
      </Box>

      {/* קישור עדין לסריקת QR - לא כפתור, מרגיש כמו פעולה משנית */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={() => { haptic('light'); onOpenQRScanner(); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.12))',
            border: '1px solid rgba(20,184,166,0.35)', cursor: 'pointer',
            color: '#0D9488',
            fontSize: 12, fontWeight: 600,
            py: 0.6, px: 1.4, borderRadius: '999px',
            boxShadow: '0 1px 3px rgba(20,184,166,0.15)',
            transition: 'color 0.12s, background 0.12s, transform 0.08s',
            '&:hover': { background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(16,185,129,0.2))' },
            '&:active': { opacity: 0.75, transform: 'scale(0.97)' },
          }}
        >
          <QrCodeScannerIcon sx={{ fontSize: 14 }} />
          {t('joinViaQr')}
        </Box>
      </Box>

      {joinError && <Alert severity={joinCooldown > 0 ? 'warning' : 'error'} sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}>
        {joinCooldown > 0 ? `${joinError} (${joinCooldown}s)` : joinError}
      </Alert>}

      <Button
        variant="contained"
        fullWidth
        onClick={onSubmit}
        disabled={joinCode.length < 6 || joinPass.length < 4 || joiningGroup || joinCooldown > 0}
        sx={{
          py: 1.5,
          fontSize: 15,
          fontWeight: 600,
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
          '&:disabled': { boxShadow: 'none' }
        }}
      >
        {joiningGroup ? (
          <CircularProgress size={24} sx={{ color: 'white' }} />
        ) : (
          t('joinGroup')
        )}
      </Button>
    </Modal>
  );
};
