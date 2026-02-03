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
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>מדיניות פרטיות</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary', fontSize: 13 }}>
              עדכון אחרון: פברואר 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>1. מידע שאנו אוספים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו אוספים מידע שאתה מספק לנו ישירות:{'\n'}
              • פרטי חשבון: שם, כתובת אימייל, תמונת פרופיל (אם נכנסת דרך Google){'\n'}
              • תוכן משתמש: רשימות קניות, מוצרים, והערות שאתה יוצר{'\n'}
              • העדפות: הגדרות שפה, מצב תצוגה, והעדפות התראות
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>2. כיצד אנו משתמשים במידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • לספק ולתחזק את השירות{'\n'}
              • לאפשר שיתוף רשימות עם משתמשים אחרים{'\n'}
              • לשלוח התראות על פעילות ברשימות משותפות{'\n'}
              • לשפר את השירות ולתקן תקלות
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>3. שיתוף מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו לא מוכרים, משכירים או משתפים את המידע האישי שלך עם צדדים שלישיים למטרות שיווקיות.{'\n\n'}
              המידע משותף רק:{'\n'}
              • עם משתמשים אחרים ברשימות משותפות (שם ותמונת פרופיל){'\n'}
              • עם ספקי שירות הכרחיים להפעלת האפליקציה{'\n'}
              • כאשר נדרש על פי חוק
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>4. אבטחת מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו מיישמים אמצעי אבטחה מקובלים להגנה על המידע שלך, כולל הצפנה בהעברה ובאחסון.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>5. שמירת מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו שומרים את המידע שלך כל עוד חשבונך פעיל. עם מחיקת החשבון, כל המידע נמחק לצמיתות.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>6. הזכויות שלך</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • גישה: לצפות במידע ששמור עליך{'\n'}
              • תיקון: לעדכן את פרטי החשבון שלך{'\n'}
              • מחיקה: למחוק את החשבון וכל המידע{'\n'}
              • ניוד: לייצא את הנתונים שלך{'\n\n'}
              לביצוע פניה, צור קשר דרך "עזרה ותמיכה" בהגדרות.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>7. עדכונים למדיניות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באפליקציה.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>8. יצירת קשר</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              לשאלות בנוגע למדיניות פרטיות זו, פנה אלינו דרך "עזרה ותמיכה" בהגדרות האפליקציה.
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
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Privacy Policy</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary', fontSize: 13 }}>
              Last updated: February 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>1. Information We Collect</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We collect information you provide directly:{'\n'}
              • Account info: name, email address, profile picture (if signing in via Google){'\n'}
              • User content: shopping lists, products, and notes you create{'\n'}
              • Preferences: language, display mode, and notification settings
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>2. How We Use Information</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • To provide and maintain the Service{'\n'}
              • To enable list sharing with other users{'\n'}
              • To send notifications about shared list activity{'\n'}
              • To improve the Service and fix issues
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>3. Information Sharing</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We do not sell, rent, or share your personal information with third parties for marketing purposes.{'\n\n'}
              Information is shared only:{'\n'}
              • With other users in shared lists (name and profile picture){'\n'}
              • With service providers necessary to operate the app{'\n'}
              • When required by law
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>4. Data Security</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We implement industry-standard security measures to protect your information, including encryption in transit and at rest.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>5. Data Retention</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We retain your information as long as your account is active. Upon account deletion, all data is permanently removed.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>6. Your Rights</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • Access: View information stored about you{'\n'}
              • Correction: Update your account details{'\n'}
              • Deletion: Delete your account and all data{'\n'}
              • Portability: Export your data{'\n\n'}
              To make a request, contact us via "Help & Support" in settings.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>7. Policy Updates</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We may update this policy from time to time. Material changes will be posted in the app.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>8. Contact Us</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              For questions about this privacy policy, contact us via "Help & Support" in the app settings.
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
