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
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>תנאי שימוש</Typography>

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 3 }}>
              <Typography sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>בקצרה:</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                השתמש באפליקציה בצורה הגיונית ואנחנו נדאג שהיא תעבוד.
              </Typography>
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>מה מותר?</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • ליצור רשימות קניות{'\n'}
              • לשתף רשימות עם חברים ומשפחה{'\n'}
              • להשתמש בכל הפיצ'רים של האפליקציה
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>מה אסור?</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • לנסות לפרוץ או לשבש את האפליקציה{'\n'}
              • להשתמש באפליקציה לדברים לא חוקיים{'\n'}
              • לשתף תוכן פוגעני
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>רשימות משותפות</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • מי שיצר את הרשימה יכול להזמין ולהסיר אנשים{'\n'}
              • אפשר לעזוב כל רשימה בכל רגע{'\n'}
              • כל המשתתפים רואים את שמות החברים ברשימה
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>אחריות</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • האפליקציה מסופקת כמו שהיא{'\n'}
              • אנחנו משתדלים שהכל יעבוד, אבל לפעמים יש באגים{'\n'}
              • אתה אחראי לשמור על הסיסמה שלך
            </Typography>

            <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 4 }}>
              שאלות? פנה אלינו דרך "עזרה ותמיכה" בהגדרות.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Terms of Service</Typography>

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 3 }}>
              <Typography sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>In short:</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                Use the app sensibly and we'll keep it running for you.
              </Typography>
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>What you can do</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • Create shopping lists{'\n'}
              • Share lists with friends and family{'\n'}
              • Use all the app's features
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>What you can't do</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • Try to hack or disrupt the app{'\n'}
              • Use the app for illegal stuff{'\n'}
              • Share offensive content
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Shared lists</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • List creators can invite and remove people{'\n'}
              • You can leave any list anytime{'\n'}
              • All members can see who's in the list
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Responsibility</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • The app is provided as-is{'\n'}
              • We try to keep everything working, but bugs happen{'\n'}
              • You're responsible for keeping your password safe
            </Typography>

            <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 4 }}>
              Questions? Contact us via "Help & Support" in settings.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
