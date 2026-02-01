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
              עדכון אחרון: פברואר 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. הסכמה לתנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              בשימוש באפליקציה זו, אתה מסכים לתנאי שימוש אלה.
              אם אינך מסכים, אנא אל תשתמש באפליקציה.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. תיאור השירות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Smart Basket היא אפליקציה לניהול רשימות קניות משותפות.
              האפליקציה מאפשרת:{'\n'}
              • יצירת רשימות אישיות וקבוצתיות{'\n'}
              • שיתוף רשימות בזמן אמת{'\n'}
              • קבלת התראות על פעילות ברשימות{'\n'}
              • ניהול מוצרים וסימון קניות
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. חשבון משתמש</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • אתה אחראי לשמור על סודיות פרטי החשבון שלך{'\n'}
              • אתה אחראי לכל הפעילות תחת החשבון שלך{'\n'}
              • עליך לספק מידע מדויק בעת ההרשמה{'\n'}
              • ניתן להתחבר עם חשבון Google או אימייל וסיסמה
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. רשימות משותפות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • בעל רשימה יכול להזמין משתמשים אחרים{'\n'}
              • חברי רשימה רואים את שמות כל החברים{'\n'}
              • בעל רשימה יכול להסיר חברים{'\n'}
              • כל חבר יכול לעזוב רשימה בכל עת
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. שימוש מותר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • להשתמש באפליקציה למטרות חוקיות בלבד{'\n'}
              • לא לנסות לפרוץ או לשבש את השירות{'\n'}
              • לא להעלות תוכן פוגעני או בלתי חוקי{'\n'}
              • לא ליצור חשבונות מרובים לרעה
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. הגבלת אחריות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              השירות מסופק "כמות שהוא" (AS IS).
              איננו אחראים לאובדן נתונים או נזקים הנובעים משימוש באפליקציה.
              מומלץ לא להסתמך על האפליקציה כגיבוי יחיד.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. שינויים בתנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנו שומרים את הזכות לעדכן תנאים אלה בכל עת.
              שימוש מתמשך באפליקציה מהווה הסכמה לתנאים המעודכנים.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>8. יצירת קשר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              לשאלות, ניתן לפנות בוואטסאפ: 058-696-3966
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Terms of Service</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Last updated: February 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. Agreement to Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              By using this application, you agree to these terms of service.
              If you do not agree, please do not use the application.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. Service Description</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Smart Basket is an app for managing shared shopping lists.
              The app allows:{'\n'}
              • Creating personal and group lists{'\n'}
              • Real-time list sharing{'\n'}
              • Receiving notifications about list activity{'\n'}
              • Managing products and marking purchases
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. User Account</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • You are responsible for maintaining account confidentiality{'\n'}
              • You are responsible for all activity under your account{'\n'}
              • You must provide accurate information during registration{'\n'}
              • You can sign in with Google or email and password
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. Shared Lists</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • List owners can invite other users{'\n'}
              • List members can see all members names{'\n'}
              • List owners can remove members{'\n'}
              • Any member can leave a list at any time
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. Permitted Use</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Use the app for lawful purposes only{'\n'}
              • Do not attempt to hack or disrupt the service{'\n'}
              • Do not upload offensive or illegal content{'\n'}
              • Do not create multiple accounts for abuse
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. Limitation of Liability</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              The service is provided "AS IS".
              We are not responsible for data loss or damages resulting from app usage.
              It is recommended not to rely on the app as your only backup.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. Changes to Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We reserve the right to update these terms at any time.
              Continued use of the app constitutes agreement to updated terms.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>8. Contact Us</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              For questions, contact us on WhatsApp: 058-696-3966
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
