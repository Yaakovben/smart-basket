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
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>תנאי שימוש</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary', fontSize: 13 }}>
              עדכון אחרון: פברואר 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>1. קבלת התנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              השימוש באפליקציית Smart Basket ("השירות") מותנה בהסכמתך לתנאים אלה. גישה או שימוש בשירות מהווים הסכמה לתנאים.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>2. תיאור השירות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              Smart Basket היא אפליקציה לניהול רשימות קניות המאפשרת:{'\n'}
              • יצירה וניהול של רשימות קניות{'\n'}
              • שיתוף רשימות בזמן אמת עם משתמשים אחרים{'\n'}
              • קבלת התראות על פעילות ברשימות משותפות
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>3. חשבון משתמש</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • עליך לספק מידע מדויק בעת ההרשמה{'\n'}
              • אתה אחראי לשמירה על אבטחת חשבונך{'\n'}
              • עליך להודיע מיד על כל שימוש לא מורשה בחשבונך
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>4. רשימות משותפות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • יוצר הרשימה רשאי להזמין ולהסיר משתתפים{'\n'}
              • משתתפים יכולים לעזוב רשימה בכל עת{'\n'}
              • משתתפים רואים את שמות כל חברי הרשימה
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>5. שימוש מותר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אתה מתחייב:{'\n'}
              • להשתמש בשירות למטרות חוקיות בלבד{'\n'}
              • לא לנסות לפרוץ או לשבש את השירות{'\n'}
              • לא להעלות תוכן פוגעני או בלתי חוקי{'\n'}
              • לא לעשות שימוש מסחרי ללא אישור
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>6. קניין רוחני</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              כל הזכויות בשירות שמורות לנו. התוכן שאתה יוצר נשאר בבעלותך.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>7. הגבלת אחריות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              השירות מסופק "כמו שהוא" (AS IS). אנו לא אחראים לנזקים הנובעים משימוש בשירות, אובדן נתונים, או הפרעות בשירות.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>8. סיום</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו רשאים להשעות או לסיים את הגישה לחשבונך בכל עת. באפשרותך למחוק את חשבונך דרך ההגדרות.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>9. שינויים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              אנו רשאים לעדכן תנאים אלה. המשך השימוש לאחר פרסום השינויים מהווה הסכמה לתנאים המעודכנים.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>10. יצירת קשר</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              לשאלות, פנה אלינו דרך "עזרה ותמיכה" בהגדרות.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Terms of Service</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary', fontSize: 13 }}>
              Last updated: February 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>1. Acceptance of Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              Use of the Smart Basket application ("Service") is subject to your acceptance of these terms. Accessing or using the Service constitutes agreement to these terms.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>2. Service Description</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              Smart Basket is a shopping list management app that enables:{'\n'}
              • Creation and management of shopping lists{'\n'}
              • Real-time list sharing with other users{'\n'}
              • Notifications about shared list activity
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>3. User Account</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • You must provide accurate information during registration{'\n'}
              • You are responsible for maintaining account security{'\n'}
              • You must notify us immediately of any unauthorized use
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>4. Shared Lists</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              • List creators can invite and remove participants{'\n'}
              • Participants can leave a list at any time{'\n'}
              • Participants can see the names of all list members
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>5. Acceptable Use</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              You agree:{'\n'}
              • To use the Service for lawful purposes only{'\n'}
              • Not to attempt to hack or disrupt the Service{'\n'}
              • Not to upload offensive or illegal content{'\n'}
              • Not to make commercial use without permission
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>6. Intellectual Property</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              All rights in the Service are reserved. Content you create remains your property.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>7. Limitation of Liability</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              The Service is provided "AS IS". We are not liable for damages arising from use of the Service, data loss, or service interruptions.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>8. Termination</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We may suspend or terminate access to your account at any time. You may delete your account through settings.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>9. Changes</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7 }}>
              We may update these terms. Continued use after posting changes constitutes acceptance of the updated terms.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>10. Contact</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              For questions, contact us via "Help & Support" in settings.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
