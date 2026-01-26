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
              עדכון אחרון: ינואר 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. מידע שאנו אוספים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • שם ואימייל בעת ההרשמה{'\n'}
              • רשימות קניות שאתה יוצר{'\n'}
              • העדפות שפה ותצוגה{'\n'}
              • במקרה של התחברות דרך Google - מידע בסיסי מחשבון Google שלך
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. כיצד אנו משתמשים במידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • לספק את שירות רשימת הקניות{'\n'}
              • לאפשר שיתוף רשימות עם אחרים{'\n'}
              • לשמור את ההעדפות שלך{'\n'}
              • לשפר את השירות
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. אחסון מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              המידע שלך נשמר באופן מקומי במכשיר שלך (localStorage).
              אנחנו לא שולחים את המידע לשרתים חיצוניים למעט שירות ההזדהות של Google.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. שיתוף מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנחנו לא מוכרים או משתפים את המידע האישי שלך עם צדדים שלישיים,
              למעט כאשר נדרש על פי חוק.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. הזכויות שלך</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • לגשת למידע שלך{'\n'}
              • למחוק את המידע שלך (דרך ההגדרות){'\n'}
              • לייצא את המידע שלך{'\n'}
              • לבטל את הסכמתך בכל עת
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. יצירת קשר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              לשאלות בנוגע למדיניות פרטיות זו, ניתן לפנות אלינו באימייל.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Privacy Policy</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Last updated: January 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. Information We Collect</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Name and email during registration{'\n'}
              • Shopping lists you create{'\n'}
              • Language and display preferences{'\n'}
              • When signing in with Google - basic information from your Google account
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. How We Use Information</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • To provide the shopping list service{'\n'}
              • To enable list sharing with others{'\n'}
              • To save your preferences{'\n'}
              • To improve the service
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. Data Storage</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Your data is stored locally on your device (localStorage).
              We do not send data to external servers except for Google authentication service.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. Data Sharing</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We do not sell or share your personal information with third parties,
              except when required by law.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. Your Rights</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Access your data{'\n'}
              • Delete your data (via settings){'\n'}
              • Export your data{'\n'}
              • Withdraw consent at any time
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. Contact Us</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              For questions about this privacy policy, please contact us via email.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';
