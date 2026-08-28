import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useSettings } from '../context/SettingsContext';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// פס חיבור גלובלי — נצמד לראש המסך (מעל כל תוכן), מוצג רק כשיש בעיה.
// Portal ל-document.body כדי לעקוף ancestor עם transform שהיה שובר position:fixed.
//
// עיצוב מכוון להיות רגוע ולא מבהיל: פס דק, צבע עמום (לא אדום/כתום זועק),
// כניסה חלקה מלמעלה, וניתן לסגירה בלחיצה. הניסוח מבדיל בין "אין אינטרנט
// אצל הלקוח" (offline) ל"החיבור לזמן־אמת נקטע" (reconnecting) — בלי אף
// פעם לרמוז שהתקלה בשרת שלנו.
export const ConnectionStatusIcon = () => {
  const { phase, pendingCount } = useConnectionStatus();
  const { t } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  // כשהמצב חוזר ל-online — מאפסים את הסתרה כך שיוצג שוב בבעיה הבאה
  if (phase === 'online' && dismissed) setDismissed(false);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  if (phase === 'online' || phase === 'trying' || dismissed) return null;

  const isOffline = phase === 'offline';

  const mainText = isOffline ? t('offlineShort') : t('reconnectingMessage');

  // תת-כיתוב רק במצב אין קליטה (ב-reconnecting זה רק ה-socket, אין מה להסביר)
  const subText = isOffline
    ? (pendingCount > 0
        ? t('offlineActionsPending').replace('{count}', String(pendingCount))
        : t('offlineWillSync'))
    : null;

  // פלטת צבעים עמומה — נוכחת אך לא זועקת. offline מעט חם יותר מ-reconnecting.
  // גרדיאנט עדין (לא flat) - עקבי עם שאר "אריחי הגרדיאנט" באפליקציה.
  const bg = isOffline
    ? 'linear-gradient(135deg, rgba(146,138,132,0.97), rgba(87,83,78,0.97))'
    : 'linear-gradient(135deg, rgba(120,135,155,0.97), rgba(71,85,105,0.97))';
  const accent = isOffline ? '#fdba74' : '#cbd5e1';

  return createPortal(
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `2px solid ${accent}`,
        pt: 'calc(env(safe-area-inset-top) + 7px)',
        pb: '7px',
        px: 1.75,
        display: 'flex',
        alignItems: 'center',
        gap: 1.1,
        boxShadow: '0 2px 14px rgba(0,0,0,0.18)',
        '@keyframes connSlideDown': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        animation: 'connSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Box sx={{
        position: 'relative', width: 30, height: 30, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.14)',
          animation: 'connIconPulse 2s ease-in-out infinite',
          '@keyframes connIconPulse': {
            '0%, 100%': { transform: 'scale(0.85)', opacity: 0.6 },
            '50%': { transform: 'scale(1.05)', opacity: 1 },
          },
        }} />
        <WifiFadeIcon style={{ fontSize: 20, color: 'white', flexShrink: 0, opacity: 0.95, position: 'relative' }} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.3, letterSpacing: 0.1 }}>
          {mainText}
        </Typography>
        {subText && (
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.78)', lineHeight: 1.35, mt: '1px' }}>
            {subText}
          </Typography>
        )}
      </Box>
      {pendingCount > 0 && (
        <Box sx={{
          minWidth: 19, height: 19, px: '4px',
          borderRadius: '999px',
          bgcolor: 'rgba(255,255,255,0.2)',
          color: 'white',
          fontSize: 10.5,
          fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.4)',
          flexShrink: 0,
        }}>
          {pendingCount > 99 ? '99+' : pendingCount}
        </Box>
      )}
      <IconButton
        size="small"
        onClick={handleDismiss}
        aria-label={t('close')}
        sx={{
          color: 'rgba(255,255,255,0.75)',
          p: '3px',
          flexShrink: 0,
          '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>,
    document.body
  );
};
