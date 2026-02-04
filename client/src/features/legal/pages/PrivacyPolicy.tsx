import { memo } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', mb: 1, mt: 3 }}>
    {children}
  </Typography>
);

const SectionText = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: 14 }}>
    {children}
  </Typography>
);

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
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          {isHebrew ? (
            <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                עודכן לאחרונה: פברואר 2026
              </Typography>

              <SectionText>
                Smart Basket ("האפליקציה") מחויבת להגנה על פרטיותך. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלך.
              </SectionText>

              <SectionTitle>1. מידע שאנו אוספים</SectionTitle>
              <SectionText>
                • <strong>פרטי חשבון:</strong> שם, כתובת אימייל, וסיסמה מוצפנת{'\n'}
                • <strong>תוכן משתמש:</strong> רשימות קניות, מוצרים, וקבוצות משותפות{'\n'}
                • <strong>העדפות:</strong> הגדרות שפה, ערכת נושא, והתראות{'\n'}
                • <strong>נתוני שימוש:</strong> זמני התחברות לצורך אבטחה
              </SectionText>

              <SectionTitle>2. כיצד אנו משתמשים במידע</SectionTitle>
              <SectionText>
                • הפעלת האפליקציה ותכונותיה{'\n'}
                • שיתוף רשימות עם משתמשים אחרים שהזמנת{'\n'}
                • שליחת התראות על פעילות ברשימות המשותפות{'\n'}
                • שיפור ואבטחת השירות
              </SectionText>

              <SectionTitle>3. שיתוף מידע</SectionTitle>
              <SectionText>
                <strong>אנו לא מוכרים את המידע שלך.</strong> מידע משותף רק עם:{'\n'}
                • משתמשים אחרים ברשימות משותפות (שם בלבד){'\n'}
                • ספקי שירות הכרחיים (אחסון, אימות)
              </SectionText>

              <SectionTitle>4. אבטחת מידע</SectionTitle>
              <SectionText>
                אנו מיישמים אמצעי אבטחה סטנדרטיים בתעשייה, כולל הצפנת סיסמאות, תקשורת מאובטחת (HTTPS), וגישה מוגבלת למידע.
              </SectionText>

              <SectionTitle>5. הזכויות שלך</SectionTitle>
              <SectionText>
                • <strong>גישה:</strong> צפייה בפרטי החשבון שלך{'\n'}
                • <strong>תיקון:</strong> עדכון פרטים אישיים{'\n'}
                • <strong>מחיקה:</strong> מחיקת החשבון תסיר את כל המידע לצמיתות
              </SectionText>

              <SectionTitle>6. שינויים במדיניות</SectionTitle>
              <SectionText>
                נעדכן מדיניות זו לפי הצורך. שינויים מהותיים יפורסמו באפליקציה.
              </SectionText>

              <SectionTitle>7. יצירת קשר</SectionTitle>
              <SectionText>
                לשאלות בנוגע לפרטיות, פנה אלינו דרך "עזרה ותמיכה" בהגדרות.
              </SectionText>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                Last updated: February 2026
              </Typography>

              <SectionText>
                Smart Basket ("the App") is committed to protecting your privacy. This policy explains how we collect, use, and protect your information.
              </SectionText>

              <SectionTitle>1. Information We Collect</SectionTitle>
              <SectionText>
                • <strong>Account details:</strong> Name, email address, and encrypted password{'\n'}
                • <strong>User content:</strong> Shopping lists, products, and shared groups{'\n'}
                • <strong>Preferences:</strong> Language, theme, and notification settings{'\n'}
                • <strong>Usage data:</strong> Login times for security purposes
              </SectionText>

              <SectionTitle>2. How We Use Information</SectionTitle>
              <SectionText>
                • Operating the app and its features{'\n'}
                • Sharing lists with users you invite{'\n'}
                • Sending notifications about shared list activity{'\n'}
                • Improving and securing the service
              </SectionText>

              <SectionTitle>3. Information Sharing</SectionTitle>
              <SectionText>
                <strong>We do not sell your data.</strong> Information is shared only with:{'\n'}
                • Other users in shared lists (name only){'\n'}
                • Essential service providers (hosting, authentication)
              </SectionText>

              <SectionTitle>4. Data Security</SectionTitle>
              <SectionText>
                We implement industry-standard security measures, including password encryption, secure communication (HTTPS), and restricted data access.
              </SectionText>

              <SectionTitle>5. Your Rights</SectionTitle>
              <SectionText>
                • <strong>Access:</strong> View your account information{'\n'}
                • <strong>Correction:</strong> Update your personal details{'\n'}
                • <strong>Deletion:</strong> Deleting your account permanently removes all data
              </SectionText>

              <SectionTitle>6. Policy Changes</SectionTitle>
              <SectionText>
                We may update this policy as needed. Material changes will be posted in the app.
              </SectionText>

              <SectionTitle>7. Contact</SectionTitle>
              <SectionText>
                For privacy questions, contact us via "Help & Support" in settings.
              </SectionText>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';
