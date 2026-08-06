import { Box, Alert, Button, CircularProgress } from '@mui/material';
import type { TranslationKeys } from '../../../global/i18n/translations';

interface LoginErrorAlertProps {
  error: string;
  clearing: boolean;
  onClearCache: () => void;
  onDismiss?: () => void;
  t: (key: TranslationKeys) => string;
  fontSize: number;
}

// הודעת שגיאת התחברות + כפתור "נקה מטמון" (מוצג רק לשגיאת cacheError).
// משותף לשני מקומות התצוגה - מחוץ לטופס האימייל ובתוכו (fontSize שונה בין השניים).
export const LoginErrorAlert = ({ error, clearing, onClearCache, onDismiss, t, fontSize }: LoginErrorAlertProps) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Alert
        severity="warning"
        sx={{ borderRadius: '12px', fontSize, alignItems: 'flex-start' }}
        role="alert"
        aria-live="assertive"
        onClose={onDismiss}
      >
        {error}
      </Alert>
      {error === t('cacheError') && (
        <Button
          onClick={onClearCache}
          disabled={clearing}
          variant="contained"
          fullWidth
          sx={{
            mt: 1.5,
            fontWeight: 600,
            fontSize: 14,
            textTransform: 'none',
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: '12px',
            py: 1.25,
            '&:hover': { bgcolor: 'primary.dark' },
            '&:active': { transform: 'scale(0.97)' },
          }}
        >
          {clearing ? (
            <><CircularProgress size={18} sx={{ color: 'white', mr: 1 }} /> {t('clearCacheSubtitle')}</>
          ) : (
            t('clearCacheAndReload')
          )}
        </Button>
      )}
    </Box>
  );
};
