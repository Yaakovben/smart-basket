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
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>מדיניות פרטיות</Typography>

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 3 }}>
              <Typography sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>בקצרה:</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                אנחנו שומרים רק את מה שצריך כדי שהאפליקציה תעבוד. לא מוכרים מידע, לא עוקבים אחריך.
              </Typography>
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>מה אנחנו שומרים?</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • השם והאימייל שלך (כדי להיכנס){'\n'}
              • הרשימות והמוצרים שיצרת{'\n'}
              • ההעדפות שלך (שפה, מצב כהה)
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>מה אנחנו לא עושים?</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • לא מוכרים או משתפים את המידע שלך{'\n'}
              • לא עוקבים אחרי הפעילות שלך{'\n'}
              • לא שולחים פרסומות
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>הזכויות שלך</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • אפשר למחוק את החשבון בכל רגע (בהגדרות){'\n'}
              • אפשר לעזוב קבוצות בכל רגע{'\n'}
              • אפשר לכבות התראות
            </Typography>

            <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 4 }}>
              שאלות? פנה אלינו דרך "עזרה ותמיכה" בהגדרות.
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
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Privacy Policy</Typography>

            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 3 }}>
              <Typography sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>In short:</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
                We only store what's needed for the app to work. We don't sell data or track you.
              </Typography>
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>What we store</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • Your name and email (to sign in){'\n'}
              • Lists and products you create{'\n'}
              • Your preferences (language, dark mode)
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>What we don't do</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • We don't sell or share your data{'\n'}
              • We don't track your activity{'\n'}
              • We don't show ads
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Your rights</Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary' }}>
              • Delete your account anytime (in settings){'\n'}
              • Leave groups anytime{'\n'}
              • Turn off notifications
            </Typography>

            <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 4 }}>
              Questions? Contact us via "Help & Support" in settings.
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
