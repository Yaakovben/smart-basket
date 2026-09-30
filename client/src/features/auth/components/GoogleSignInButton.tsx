import { Button, CircularProgress } from '@mui/material';
import { GoogleLogo } from './LoginLogos';
import type { TranslationKeys } from '../../../global/i18n/translations';

interface GoogleSignInButtonProps {
  loading: boolean;
  onClick: () => void;
  t: (key: TranslationKeys) => string;
}

export const GoogleSignInButton = ({ loading, onClick, t }: GoogleSignInButtonProps) => {
  return (
    <Button
      fullWidth
      onClick={onClick}
      disabled={loading}
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
      {loading ? (
        // בזמן שהשרת מאמת (בעלייה קרה זה יכול לקחת כמה שניות): עיגול ומילים,
        // ולא רק עיגול קטן שנראה כמו סימן מקרי בכפתור ריק
        <>
          <CircularProgress size={18} thickness={5} sx={{ color: '#0D9488' }} />
          <span>{t('connectingMessage')}</span>
        </>
      ) : (
        <>
          <GoogleLogo />
          <span>{t('continueWithGoogle')}</span>
        </>
      )}
    </Button>
  );
};
