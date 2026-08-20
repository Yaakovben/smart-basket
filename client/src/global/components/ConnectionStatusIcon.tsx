import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useSettings } from '../context/SettingsContext';
import { haptic } from '../helpers';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

const TAP_LABEL_MS = 3000;

// אייקון חיבור גלובלי - overlay יחיד, position:fixed, באותו מיקום פיזי
// בדיוק (פינה שמאלית עליונה) על גבי כל עמוד באפליקציה. Portal ל-
// document.body (כמו AiAssistantFab) כדי לעקוף ancestor עם transform/
// filter שהיה הופך position:fixed ליחסי לאב.
//
// בעבר זה היה רכיב "inline" שכל כותרת עמוד הטמיעה בעצמה בתוך אשכול
// האייקונים שלה - וכיוון שלכל כותרת פריסה שונה (מספר אייקונים אחר, סדר
// אחר), האייקון "קפץ" למקום אחר בכל עמוד, ובעמודים שלא הטמיעו אותו בכלל
// (פרופיל, הגדרות, צ'אט AI, מסכי משפטי) הוא לא הופיע בכלל. עכשיו הוא
// mounted פעם אחת בלבד (ב-AppRouter) ומופיע/נעלם לפי הסטטוס בלבד, לא
// לפי איזה עמוד פתוח.
// מוצג רק כשיש בעיה (online = לא מרנדר כלום).
export const ConnectionStatusIcon = () => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const { phase, pendingCount } = useConnectionStatus();
  const [showLabel, setShowLabel] = useState(false);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (phase === 'online') return null;

  const isOffline = phase === 'offline';
  const isReconnecting = phase === 'reconnecting';
  const label = isOffline
    ? (pendingCount > 0 ? `${t('offlineMessage')} · ${t('offlinePendingSync')}` : t('offlineMessage'))
    : isReconnecting ? t('reconnectingMessage') : t('serverUnreachableMessage');
  // צהוב = socket מנותק, שחור = בעיית שרת/רשת (trying)
  const color = isOffline ? '#EF4444' : isReconnecting ? '#FBBF24' : '#111111';

  const handleTap = () => {
    haptic('light');
    setShowLabel(true);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setShowLabel(false), TAP_LABEL_MS);
  };

  return createPortal(
    <Box sx={{
      position: 'fixed',
      // פינה שמאלית עליונה (פיזית, לא RTL-relative) - קבועה בכל עמוד.
      top: 'calc(env(safe-area-inset-top) + 10px)',
      left: 12,
      zIndex: 1090,
      display: 'flex', alignItems: 'center',
    }}>
      <Box
        component="button"
        type="button"
        onClick={handleTap}
        aria-label={label}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: '50%',
          bgcolor: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          border: 'none', cursor: 'pointer', p: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex' }}>
          <WifiFadeIcon style={{ fontSize: 19, color }} />
          {isOffline && pendingCount > 0 && (
            <Box sx={{
              position: 'absolute', top: -8, insetInlineEnd: -10,
              minWidth: 13, height: 13, px: '3px',
              borderRadius: '999px',
              bgcolor: '#EF4444', color: 'white',
              fontSize: 8.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </Box>
          )}
        </Box>
      </Box>

      {showLabel && (
        <Box sx={{
          position: 'absolute', top: '100%', left: 0, mt: 0.5,
          bgcolor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          borderRadius: '10px', px: 1.25, py: 0.6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
            {label}
          </Typography>
        </Box>
      )}
    </Box>,
    document.body
  );
};
