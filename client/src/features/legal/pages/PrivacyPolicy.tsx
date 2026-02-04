import { memo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';

export const PrivacyPolicy = memo(() => {
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
            {t('privacyPolicy')}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {isHebrew ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>מדיניות פרטיות</Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>מידע שנאסף:</strong> שם, אימייל, רשימות קניות והגדרות.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>שימוש:</strong> לתפעול האפליקציה ושיתוף רשימות עם אחרים.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>שיתוף:</strong> לא נמכור את המידע שלך. משתמשים אחרים יראו רק את שמך ברשימות משותפות.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>מחיקה:</strong> מחיקת החשבון מוחקת את כל המידע לצמיתות.
            </Typography>

            <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>יצירת קשר:</strong> דרך "עזרה ותמיכה" בהגדרות.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Privacy Policy</Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Data collected:</strong> Name, email, shopping lists, and settings.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Usage:</strong> To operate the app and enable list sharing.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Sharing:</strong> We don't sell your data. Other users only see your name in shared lists.
            </Typography>

            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Deletion:</strong> Deleting your account permanently removes all data.
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

PrivacyPolicy.displayName = 'PrivacyPolicy';
