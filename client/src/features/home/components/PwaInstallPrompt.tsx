import { useState, useEffect, useCallback, memo } from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { canShowSecondaryPopup, markPopupShown } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { isInBrowser, isIOS, PWA_DISMISSED_KEY } from '../helpers/pwaDetection';

export const PwaInstallPrompt = memo(({ t }: { t: (key: TranslationKeys) => string }) => {
  const [show, setShow] = useState(false);
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  useEffect(() => {
    // תנאי סף בסיסיים: רק בדפדפן ולא נדחה לצמיתות
    if (!isInBrowser()) return;
    if (localStorage.getItem(PWA_DISMISSED_KEY)) return;

    // תיאום עם popups אחרים - לא להופיע אם החיזוק היומי הוצג היום או ששכנו אחר פעיל
    if (!canShowSecondaryPopup()) return;

    // 15 שניות אחרי טעינת הבית - נותן למשתמש רגע להסתכל/להתנסות באפליקציה
    // לפני שמפריעים לו עם הצעת התקנה, במקום לקפוץ עליו מיד עם הכניסה.
    const timer = setTimeout(() => {
      // בדיקה מחודשת רגע לפני הצגה - שמא בינתיים הופיע popup אחר
      if (!canShowSecondaryPopup()) return;
      markPopupShown('pwa-install');
      setShow(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(PWA_DISMISSED_KEY, '1');
  }, []);

  if (!show) return null;

  const ios = isIOS();

  return (
    <>
      {/* רקע מטושטש - הופך את זה מ"בר צף" ל"רגע" מכוון, אותו דפוס בדיוק
          כמו HomeMenuSheet ("מה תרצה ליצור?") - עקביות ויזואלית לתחושת
          bottom-sheet מוכרת. לחיצה על הרקע דוחה, כמו סגירה ב-X. */}
      <Box
        onClick={handleDismiss}
        sx={{
          position: 'fixed', inset: 0, zIndex: 1299,
          bgcolor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          animation: 'pwaBackdropIn 0.35s ease-out',
          '@keyframes pwaBackdropIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      />
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1300,
        pb: 'max(16px, env(safe-area-inset-bottom))',
        px: 2, pt: 0,
        animation: 'pwaSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        '@keyframes pwaSlideUp': {
          from: { transform: 'translateY(110%)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
      }}>
      <Box sx={{
        bgcolor: isDark ? '#1E293B' : 'white',
        borderRadius: '22px',
        boxShadow: isDark
          ? '0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)'
          : '0 -8px 40px rgba(20,184,166,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* רצועת צבע עליונה עדינה */}
        <Box sx={{
          height: 3,
          background: 'linear-gradient(90deg, #14B8A6, #10B981, #14B8A6)',
          backgroundSize: '200% 100%',
          animation: 'pwaShine 3s ease-in-out infinite',
          '@keyframes pwaShine': {
            '0%, 100%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
          },
        }} />

        <Box sx={{ p: 2.5 }}>
          {/* ראש: אייקון + כותרת + X */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
              {/* טבעת זוהרת פועמת מאחורי האייקון - נגיעה קטנה של חיות בלי להיות רועשת */}
              <Box sx={{
                position: 'absolute', inset: -4, borderRadius: '18px',
                background: 'linear-gradient(135deg, rgba(20,184,166,0.35), rgba(13,148,136,0.15))',
                animation: 'pwaIconGlow 2.4s ease-in-out infinite',
                '@keyframes pwaIconGlow': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 0.6 },
                  '50%': { transform: 'scale(1.12)', opacity: 1 },
                },
              }} />
              <Box sx={{
                position: 'relative', width: 48, height: 48, borderRadius: '14px',
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
                boxShadow: '0 6px 16px rgba(20,184,166,0.35)',
              }}>
                📲
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 15.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                {t('appName')}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3, mt: 0.25 }}>
                {t('installIosHint')}
              </Typography>
            </Box>
            <IconButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDismiss}
              size="small"
              sx={{ color: 'text.secondary', width: 32, height: 32, flexShrink: 0 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* צעדים - כרטיסים נקיים עם מספר בעיגול */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            {[1, 2].map((num) => (
              <Box
                key={num}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.06)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.15)',
                  borderRadius: '12px',
                }}
              >
                <Box sx={{
                  width: 24, height: 24, borderRadius: '50%',
                  bgcolor: '#14B8A6',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {num}
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.4, flex: 1 }}>
                  {num === 1
                    ? (ios ? t('installStep1Ios') : t('installStep1Android'))
                    : (ios ? t('installStep2Ios') : t('installStep2Android'))}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* כפתור יחיד */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleDismiss}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1.25,
              fontSize: 14,
              background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
              boxShadow: '0 4px 12px rgba(20,184,166,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0D9488, #0B7C72)',
                boxShadow: '0 6px 16px rgba(20,184,166,0.45)',
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            {t('installDismiss')}
          </Button>
        </Box>
      </Box>
    </Box>
    </>
  );
});
PwaInstallPrompt.displayName = 'PwaInstallPrompt';
