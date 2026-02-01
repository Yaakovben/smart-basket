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

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. קבלת התנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              השימוש באפליקציית Smart Basket ("השירות") מותנה בהסכמתך לתנאים אלה.
              גישה או שימוש בשירות מהווים הסכמה מלאה ובלתי מותנית לתנאים אלה.
              אם אינך מסכים לתנאים אלה, אינך רשאי להשתמש בשירות.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. תיאור השירות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Smart Basket הינה פלטפורמה לניהול רשימות קניות משותפות המאפשרת:{'\n'}
              • יצירה וניהול של רשימות קניות אישיות וקבוצתיות{'\n'}
              • שיתוף רשימות בזמן אמת עם משתמשים אחרים{'\n'}
              • קבלת התראות על פעילות ברשימות משותפות{'\n'}
              • ניהול מוצרים, כמויות וסימון רכישות
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. הרשמה וחשבון משתמש</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • הנך מתחייב לספק מידע מדויק ועדכני בעת ההרשמה{'\n'}
              • הנך אחראי באופן בלעדי לשמירה על סודיות פרטי הגישה לחשבונך{'\n'}
              • הנך נושא באחריות מלאה לכל פעילות המתבצעת תחת חשבונך{'\n'}
              • עליך להודיע מיידית על כל חשד לשימוש בלתי מורשה בחשבונך{'\n'}
              • ניתן להירשם באמצעות כתובת דוא"ל או חשבון Google
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. רשימות משותפות וקבוצות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • יוצר הרשימה ("הבעלים") רשאי להזמין משתמשים נוספים{'\n'}
              • הבעלים רשאי להסיר משתתפים מהרשימה בכל עת{'\n'}
              • כל משתתף רשאי לעזוב רשימה משותפת בכל עת{'\n'}
              • משתתפים ברשימה רואים את שמות כל חברי הרשימה{'\n'}
              • הבעלים אחראי לניהול הרשאות הגישה לרשימה
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. שימוש מותר והגבלות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              הנך מתחייב:{'\n'}
              • להשתמש בשירות למטרות חוקיות בלבד{'\n'}
              • שלא לנסות לחדור, לפרוץ או לשבש את השירות או השרתים{'\n'}
              • שלא להעלות תוכן פוגעני, מאיים, משמיץ או בלתי חוקי{'\n'}
              • שלא ליצור חשבונות מרובים למטרות הונאה או שימוש לרעה{'\n'}
              • שלא לעשות שימוש מסחרי בשירות ללא אישור מראש
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. קניין רוחני</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              כל הזכויות בשירות, לרבות עיצוב, קוד, לוגו וסימני מסחר, שמורות לנו.
              אין להעתיק, לשכפל, להפיץ או ליצור יצירות נגזרות מהשירות ללא אישור.
              התוכן שאתה יוצר (רשימות, מוצרים) נשאר בבעלותך.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. הגבלת אחריות</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              השירות מסופק במצבו כפי שהוא ("AS IS") ללא אחריות מכל סוג שהוא.
              לא נישא באחריות לנזקים ישירים, עקיפים, מיוחדים או תוצאתיים הנובעים מ:{'\n'}
              • שימוש או חוסר יכולת להשתמש בשירות{'\n'}
              • אובדן נתונים או מידע{'\n'}
              • הפרעות או תקלות בשירות{'\n'}
              • פעולות של צדדים שלישיים
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>8. שיפוי</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              הנך מסכים לשפות ולפצות אותנו בגין כל תביעה, נזק או הוצאה
              הנובעים מהפרת תנאים אלה על ידך או משימוש בלתי מורשה בחשבונך.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>9. סיום שימוש</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנו שומרים על הזכות להשעות או לסיים את הגישה לחשבונך
              בכל עת ומכל סיבה, לרבות הפרת תנאים אלה.
              באפשרותך למחוק את חשבונך בכל עת דרך הגדרות האפליקציה.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>10. שינויים בתנאים</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              אנו רשאים לעדכן תנאים אלה מעת לעת. שינויים מהותיים יפורסמו באפליקציה.
              המשך השימוש בשירות לאחר פרסום השינויים מהווה הסכמה לתנאים המעודכנים.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>11. דין וסמכות שיפוט</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              תנאים אלה כפופים לחוקי מדינת ישראל.
              כל מחלוקת תידון בבתי המשפט המוסמכים בישראל בלבד.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>12. יצירת קשר</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              לשאלות בנוגע לתנאים אלה, ניתן לפנות אלינו דרך אפשרות "עזרה ותמיכה" בהגדרות האפליקציה.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Terms of Service</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Last updated: February 2025
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>1. Acceptance of Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Use of the Smart Basket application ("Service") is subject to your acceptance of these terms.
              Accessing or using the Service constitutes full and unconditional agreement to these terms.
              If you do not agree to these terms, you may not use the Service.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>2. Service Description</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              Smart Basket is a platform for managing shared shopping lists that enables:{'\n'}
              • Creation and management of personal and group shopping lists{'\n'}
              • Real-time list sharing with other users{'\n'}
              • Notifications about shared list activity{'\n'}
              • Product management, quantities, and purchase tracking
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>3. Registration and User Account</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • You agree to provide accurate and current information during registration{'\n'}
              • You are solely responsible for maintaining the confidentiality of your account credentials{'\n'}
              • You bear full responsibility for all activity occurring under your account{'\n'}
              • You must notify us immediately of any suspected unauthorized use of your account{'\n'}
              • Registration is available via email address or Google account
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>4. Shared Lists and Groups</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              • The list creator ("Owner") may invite additional users{'\n'}
              • The Owner may remove participants from the list at any time{'\n'}
              • Any participant may leave a shared list at any time{'\n'}
              • List participants can see the names of all list members{'\n'}
              • The Owner is responsible for managing list access permissions
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>5. Permitted Use and Restrictions</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              You agree:{'\n'}
              • To use the Service for lawful purposes only{'\n'}
              • Not to attempt to penetrate, hack, or disrupt the Service or servers{'\n'}
              • Not to upload offensive, threatening, defamatory, or illegal content{'\n'}
              • Not to create multiple accounts for fraud or abuse purposes{'\n'}
              • Not to make commercial use of the Service without prior authorization
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>6. Intellectual Property</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              All rights in the Service, including design, code, logo, and trademarks, are reserved.
              Copying, reproducing, distributing, or creating derivative works without permission is prohibited.
              Content you create (lists, products) remains your property.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>7. Limitation of Liability</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              The Service is provided "AS IS" without warranty of any kind.
              We shall not be liable for direct, indirect, special, or consequential damages arising from:{'\n'}
              • Use or inability to use the Service{'\n'}
              • Loss of data or information{'\n'}
              • Service interruptions or malfunctions{'\n'}
              • Actions of third parties
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>8. Indemnification</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              You agree to indemnify and hold us harmless from any claim, damage, or expense
              arising from your breach of these terms or unauthorized use of your account.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>9. Termination</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We reserve the right to suspend or terminate access to your account
              at any time and for any reason, including breach of these terms.
              You may delete your account at any time through the app settings.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>10. Changes to Terms</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              We may update these terms from time to time. Material changes will be posted in the app.
              Continued use of the Service after posting of changes constitutes acceptance of the updated terms.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>11. Governing Law and Jurisdiction</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              These terms are governed by the laws of the State of Israel.
              Any dispute shall be adjudicated exclusively in the competent courts of Israel.
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>12. Contact Us</Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              For questions regarding these terms, please contact us through the "Help & Support" option in the app settings.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
