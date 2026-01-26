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
              עדכון אחרון: ינואר 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. הסכמה לתנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              בשימוש באפליקציה זו, אתה מסכים לתנאי שימוש אלה.
              אם אינך מסכים, אנא אל תשתמש באפליקציה.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. תיאור השירות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Smart Basket היא אפליקציה לניהול רשימות קניות.
              האפליקציה מאפשרת יצירת רשימות, שיתוף עם אחרים, וניהול פריטים.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. חשבון משתמש</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • אתה אחראי לשמור על סודיות פרטי החשבון שלך{'\n'}
              • אתה אחראי לכל הפעילות תחת החשבון שלך{'\n'}
              • עליך לספק מידע מדויק בעת ההרשמה
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. שימוש מותר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • להשתמש באפליקציה למטרות חוקיות בלבד{'\n'}
              • לא לנסות לפרוץ או לשבש את השירות{'\n'}
              • לא להעלות תוכן פוגעני או בלתי חוקי
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. הגבלת אחריות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              השירות מסופק "כמות שהוא" (AS IS).
              איננו אחראים לאובדן נתונים או נזקים הנובעים משימוש באפליקציה.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. שינויים בתנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנו שומרים את הזכות לעדכן תנאים אלה בכל עת.
              שימוש מתמשך באפליקציה מהווה הסכמה לתנאים המעודכנים.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. יצירת קשר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              לשאלות בנוגע לתנאי שימוש אלה, ניתן לפנות אלינו באימייל.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Terms of Service</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Last updated: January 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. Agreement to Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              By using this application, you agree to these terms of service.
              If you do not agree, please do not use the application.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. Service Description</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Smart Basket is an application for managing shopping lists.
              The app allows creating lists, sharing with others, and managing items.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. User Account</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • You are responsible for maintaining account confidentiality{'\n'}
              • You are responsible for all activity under your account{'\n'}
              • You must provide accurate information during registration
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. Permitted Use</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Use the app for lawful purposes only{'\n'}
              • Do not attempt to hack or disrupt the service{'\n'}
              • Do not upload offensive or illegal content
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. Limitation of Liability</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              The service is provided "AS IS".
              We are not responsible for data loss or damages resulting from app usage.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. Changes to Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We reserve the right to update these terms at any time.
              Continued use of the app constitutes agreement to updated terms.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. Contact Us</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              For questions about these terms, please contact us via email.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
