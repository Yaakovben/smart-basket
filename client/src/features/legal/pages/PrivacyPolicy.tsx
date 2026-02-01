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

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. מבוא</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              מדיניות פרטיות זו מתארת כיצד Smart Basket ("אנחנו", "השירות") אוספת, משתמשת ומגנה על המידע האישי שלך.
              השימוש בשירות מהווה הסכמה לאיסוף ושימוש במידע בהתאם למדיניות זו.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. מידע שאנו אוספים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>מידע שאתה מספק:</strong>{'\n'}
              • פרטי הרשמה: שם ודוא"ל{'\n'}
              • סיסמה (נשמרת בהצפנה בלתי הפיכה){'\n'}
              • תוכן שאתה יוצר: רשימות קניות ומוצרים{'\n'}
              {'\n'}
              <strong>מידע שנאסף אוטומטית:</strong>{'\n'}
              • התראות על פעילות ברשימות משותפות{'\n'}
              • העדפות שימוש (שפה, תצוגה, התראות){'\n'}
              • בהתחברות דרך Google: שם, דוא"ל ותמונת פרופיל
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. מטרות השימוש במידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנו משתמשים במידע שלך אך ורק למטרות הבאות:{'\n'}
              • אספקת שירות ניהול רשימות הקניות{'\n'}
              • אפשור שיתוף רשימות בזמן אמת עם משתמשים מורשים{'\n'}
              • שליחת התראות רלוונטיות על פעילות ברשימות{'\n'}
              • שמירת העדפותיך האישיות{'\n'}
              • שיפור ותחזוקת השירות
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. אחסון ואבטחת מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • המידע מאוחסן בשרתים מאובטחים של MongoDB Atlas{'\n'}
              • סיסמאות מוצפנות באמצעות bcrypt ואינן ניתנות לשחזור{'\n'}
              • כל התקשורת מוצפנת באמצעות HTTPS/TLS{'\n'}
              • העדפות מסוימות נשמרות מקומית במכשירך{'\n'}
              • התראות נמחקות אוטומטית לאחר 30 יום{'\n'}
              • אנו מיישמים אמצעי אבטחה מקובלים בתעשייה
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. שיתוף מידע עם צדדים שלישיים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • שמך מוצג אך ורק לחברים ברשימות שאתה משתתף בהן{'\n'}
              • איננו מוכרים, משכירים או משתפים מידע אישי עם צדדים שלישיים למטרות שיווק{'\n'}
              • מידע עשוי להימסר לרשויות אכיפת החוק אך ורק בהתאם לצו שיפוטי או דרישה חוקית מחייבת
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. הזכויות שלך</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              בהתאם לחוקי הגנת הפרטיות, עומדות לך הזכויות הבאות:{'\n'}
              • <strong>זכות גישה:</strong> לצפות במידע שנאסף אודותיך{'\n'}
              • <strong>זכות מחיקה:</strong> למחוק את חשבונך וכל המידע הקשור (דרך ההגדרות){'\n'}
              • <strong>זכות התנגדות:</strong> להתנגד לשימושים מסוימים במידע{'\n'}
              • <strong>זכות יציאה:</strong> לעזוב רשימות משותפות בכל עת{'\n'}
              • <strong>שליטה בהתראות:</strong> לנהל אילו התראות תקבל
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. שמירת מידע</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              המידע שלך נשמר כל עוד חשבונך פעיל.
              לאחר מחיקת החשבון, כל המידע האישי יימחק תוך 30 יום,
              למעט מידע שנדרש לשמור על פי חוק.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>8. שינויים במדיניות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנו עשויים לעדכן מדיניות זו מעת לעת.
              שינויים מהותיים יפורסמו באפליקציה.
              המשך השימוש בשירות לאחר פרסום השינויים מהווה הסכמה למדיניות המעודכנת.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>9. יצירת קשר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              לשאלות בנוגע לפרטיות או למימוש זכויותיך,
              ניתן לפנות אלינו דרך אפשרות "עזרה ותמיכה" בהגדרות האפליקציה.
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

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. Introduction</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              This Privacy Policy describes how Smart Basket ("we", "the Service") collects, uses, and protects your personal information.
              Use of the Service constitutes consent to the collection and use of information in accordance with this policy.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. Information We Collect</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              <strong>Information you provide:</strong>{'\n'}
              • Registration details: name and email{'\n'}
              • Password (stored with irreversible encryption){'\n'}
              • Content you create: shopping lists and products{'\n'}
              {'\n'}
              <strong>Automatically collected information:</strong>{'\n'}
              • Notifications about shared list activity{'\n'}
              • Usage preferences (language, display, notifications){'\n'}
              • When signing in with Google: name, email, and profile photo
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. Purposes of Use</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We use your information solely for the following purposes:{'\n'}
              • Providing the shopping list management service{'\n'}
              • Enabling real-time list sharing with authorized users{'\n'}
              • Sending relevant notifications about list activity{'\n'}
              • Saving your personal preferences{'\n'}
              • Improving and maintaining the Service
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. Data Storage and Security</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Data is stored on secure MongoDB Atlas servers{'\n'}
              • Passwords are encrypted using bcrypt and cannot be recovered{'\n'}
              • All communication is encrypted using HTTPS/TLS{'\n'}
              • Some preferences are stored locally on your device{'\n'}
              • Notifications are automatically deleted after 30 days{'\n'}
              • We implement industry-standard security measures
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. Third-Party Data Sharing</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • Your name is visible only to members of lists you participate in{'\n'}
              • We do not sell, rent, or share personal information with third parties for marketing purposes{'\n'}
              • Information may be disclosed to law enforcement only pursuant to a court order or binding legal requirement
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. Your Rights</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Under privacy protection laws, you have the following rights:{'\n'}
              • <strong>Right of access:</strong> View information collected about you{'\n'}
              • <strong>Right to deletion:</strong> Delete your account and all associated data (via settings){'\n'}
              • <strong>Right to object:</strong> Object to certain uses of your information{'\n'}
              • <strong>Right to leave:</strong> Leave shared lists at any time{'\n'}
              • <strong>Notification control:</strong> Manage which notifications you receive
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. Data Retention</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Your information is retained as long as your account is active.
              After account deletion, all personal data will be deleted within 30 days,
              except for information required to be retained by law.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>8. Policy Changes</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We may update this policy from time to time.
              Material changes will be posted in the app.
              Continued use of the Service after posting of changes constitutes acceptance of the updated policy.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>9. Contact Us</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              For privacy questions or to exercise your rights,
              please contact us through the "Help & Support" option in the app settings.
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
