import { memo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';

export const TermsOfService = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isHebrew = settings.language === 'he';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
        p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
        borderRadius: '0 0 24px 24px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            aria-label={t('back')}
          >
            <ArrowForwardIcon />
          </IconButton>
          <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700 }}>
            {t('termsOfService')}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {isHebrew ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>תנאי שימוש</Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>השירות:</strong> Smart Basket מאפשרת ניהול ושיתוף רשימות קניות.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>חשבון:</strong> אתה אחראי לאבטחת החשבון שלך.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>שימוש:</strong> השתמש בשירות למטרות חוקיות בלבד.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>אחריות:</strong> השירות מסופק "כמו שהוא" (AS IS).
            </Typography>

            <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>יצירת קשר:</strong> דרך "עזרה ותמיכה" בהגדרות.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Terms of Service</Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Service:</strong> Smart Basket enables shopping list management and sharing.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Account:</strong> You are responsible for your account security.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Usage:</strong> Use the service for lawful purposes only.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Liability:</strong> The service is provided "AS IS".
            </Typography>

            <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Contact:</strong> Via "Help & Support" in settings.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
