import { memo } from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';

const CONSENT_KEY = 'sb_consent_accepted';

export const PrivacyPolicy = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isHebrew = settings.language === 'he';
  const hasConsent = localStorage.getItem(CONSENT_KEY) === 'true';

  const handleAcceptAndGoBack = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    navigate(-1);
  };

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
              עדכון אחרון: פברואר 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. מידע שאנו אוספים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • שם ואימייל בעת ההרשמה{'\n'}
              • סיסמה מוצפנת (bcrypt){'\n'}
              • רשימות קניות ומוצרים שאתה יוצר{'\n'}
              • התראות על פעילות ברשימות משותפות{'\n'}
              • העדפות שפה, תצוגה והתראות{'\n'}
              • בהתחברות דרך Google - מידע בסיסי מחשבון Google
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. כיצד אנו משתמשים במידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • לספק את שירות רשימת הקניות{'\n'}
              • לאפשר שיתוף רשימות בזמן אמת{'\n'}
              • לשלוח התראות על פעילות ברשימות{'\n'}
              • לשמור את ההעדפות שלך{'\n'}
              • לשפר את השירות
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. אחסון מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • המידע נשמר בשרתים מאובטחים (MongoDB Atlas){'\n'}
              • הסיסמאות מוצפנות ולא ניתנות לשחזור{'\n'}
              • העדפות מסוימות נשמרות במכשיר שלך{'\n'}
              • התראות נמחקות אוטומטית לאחר 30 יום{'\n'}
              • התקשורת מוצפנת (HTTPS)
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. שיתוף מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • שמך מוצג לחברי הרשימות שלך{'\n'}
              • אנחנו לא מוכרים או משתפים מידע עם צדדים שלישיים{'\n'}
              • מידע יימסר לרשויות רק לפי דרישה חוקית
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. הזכויות שלך</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • לגשת למידע שלך{'\n'}
              • למחוק את כל המידע שלך (דרך ההגדרות){'\n'}
              • לעזוב רשימות משותפות בכל עת{'\n'}
              • לשלוט בהתראות שאתה מקבל
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. יצירת קשר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              לשאלות בנוגע לפרטיות, ניתן לפנות בוואטסאפ: 058-696-3966
            </Typography>

            {!hasConsent && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleAcceptAndGoBack}
                sx={{ mt: 3, py: 1.5, fontSize: 15, fontWeight: 600, borderRadius: '12px' }}
              >
                {t('accept')}
              </Button>
            )}
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Privacy Policy</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Last updated: February 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. Information We Collect</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Name and email during registration{'\n'}
              • Encrypted password (bcrypt){'\n'}
              • Shopping lists and products you create{'\n'}
              • Notifications about shared list activity{'\n'}
              • Language, display and notification preferences{'\n'}
              • When signing in with Google - basic account info
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. How We Use Information</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • To provide the shopping list service{'\n'}
              • To enable real-time list sharing{'\n'}
              • To send notifications about list activity{'\n'}
              • To save your preferences{'\n'}
              • To improve the service
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. Data Storage</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Data is stored on secure servers (MongoDB Atlas){'\n'}
              • Passwords are encrypted and cannot be recovered{'\n'}
              • Some preferences are stored on your device{'\n'}
              • Notifications are auto-deleted after 30 days{'\n'}
              • Communication is encrypted (HTTPS)
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. Data Sharing</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Your name is visible to members of your lists{'\n'}
              • We do not sell or share data with third parties{'\n'}
              • Data may be disclosed only when legally required
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. Your Rights</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Access your data{'\n'}
              • Delete all your data (via settings){'\n'}
              • Leave shared lists at any time{'\n'}
              • Control which notifications you receive
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. Contact Us</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              For privacy questions, contact us on WhatsApp: 058-696-3966
            </Typography>

            {!hasConsent && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleAcceptAndGoBack}
                sx={{ mt: 3, py: 1.5, fontSize: 15, fontWeight: 600, borderRadius: '12px' }}
              >
                {t('accept')}
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';
