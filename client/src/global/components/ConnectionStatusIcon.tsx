import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useSettings } from '../context/SettingsContext';
import { WifiFadeIcon } from './icons/WifiFadeIcon';
import { getConnectionStrings } from './connectionStatus.strings';

// פס חיבור גלובלי — נצמד לראש המסך (מעל כל תוכן), מוצג רק כשיש בעיה.
// Portal ל-document.body כדי לעקוף ancestor עם transform שהיה שובר position:fixed.
//
// עיצוב מכוון להיות רגוע ולא מבהיל: פס דק, צבע עמום (לא אדום/כתום זועק),
// כניסה חלקה מלמעלה, וניתן לסגירה בלחיצה. הניסוח מבדיל בין "אין אינטרנט
// אצל הלקוח" (offline) ל"החיבור לזמן־אמת נקטע" (reconnecting) — בלי אף
// פעם לרמוז שהתקלה בשרת שלנו.
export const ConnectionStatusIcon = () => {
  const { phase, pendingCount } = useConnectionStatus();
  const { t, settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  // מאפסים dismissed כשהכל חזר לתקין ואין שינויים שממתינים
  if (phase === 'online' && pendingCount === 0 && dismissed) setDismissed(false);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  // מפרסם את גובה הבאנר כמשתנה CSS (--conn-banner-h) כדי שטוסטים יוצגו *מתחתיו*
  // ולא יוסתרו מאחוריו. מתאפס ל-0 כשהבאנר נעלם.
  const [bannerEl, setBannerEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    if (!bannerEl) { root.style.setProperty('--conn-banner-h', '0px'); return; }
    const publish = () => root.style.setProperty('--conn-banner-h', `${bannerEl.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bannerEl);
    return () => { ro.disconnect(); root.style.setProperty('--conn-banner-h', '0px'); };
  }, [bannerEl]);

  // חיבור תקין עם שינויים שעוד לא נשלחו: הפס נשאר ומראה שהסנכרון מתקדם.
  // קודם הוא נעלם ברגע שבקשה אחת הצליחה, וחזר בבקשה האיטית הבאה, בזמן
  // שהשינויים עדיין חיכו, ולא היה ברור אם משהו בכלל קורה.
  const isSyncing = phase === 'online' && pendingCount > 0;
  if ((phase === 'online' && !isSyncing) || phase === 'trying' || dismissed) return null;

  const isOffline = phase === 'offline';
  const isWeak = phase === 'weak';
  const isServerStarting = phase === 'server-starting';
  const s = getConnectionStrings(settings.language);

  const mainText = isOffline ? s.offlineTitle
    : isWeak ? s.weakTitle
    : isServerStarting ? s.connecting
    : isSyncing ? s.syncingTitle
    : s.reconnecting;

  // תת-כיתוב: כשעוד אין שינויים שממתינים, הרגעה ("אפשר להמשיך כרגיל").
  // כשכבר נשמרו שינויים במכשיר, מספרם האמיתי מהתור במקום ההרגעה.
  const subText = isOffline
    ? (pendingCount > 0 ? s.offlinePending(pendingCount) : s.offlineCalm)
    : isWeak
      ? (pendingCount > 0 ? s.weakPending(pendingCount) : s.weakCalm)
      : pendingCount > 0 ? s.syncingPending(pendingCount) : isSyncing ? null : s.reconnectCalm;

  const bg = isOffline
    ? 'linear-gradient(135deg, rgba(146,138,132,0.97), rgba(87,83,78,0.97))'
    : 'linear-gradient(135deg, rgba(120,135,155,0.97), rgba(71,85,105,0.97))';
  const accent = isOffline ? '#fdba74' : '#cbd5e1';

  return createPortal(
    <Box
      ref={setBannerEl}
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
        pt: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top)) + 7px)',
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
      <WifiFadeIcon style={{ fontSize: 22, color: 'white', flexShrink: 0, opacity: 0.95 }} />
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
