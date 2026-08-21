import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useSettings } from '../context/SettingsContext';
import { haptic } from '../helpers';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

const TAP_LABEL_MS = 3000;

// אייקון חיבור גלובלי - overlay יחיד, position:fixed, באותו מיקום פיזי
// בדיוק על גבי כל עמוד באפליקציה - אותו מיקום ועיצוב שהיה במסך הבית
// (בלי רקע/גלולה משלו, רק האייקון בצבע שמתאר את הבעיה + drop-shadow
// עדין לקריאות על רקעים בהירים) - לא עיצוב "בטוח" חדש שמתחשב ברקע של
// כל עמוד. בכוונה עלול להסתיר תוכן בעמודים עם כותרת שונה - זה בסדר,
// עדיפות לעקביות מיקום/עיצוב על פני "לא להפריע" בכל עמוד לגופו.
// Portal ל-document.body (כמו AiAssistantFab) כדי לעקוף ancestor עם
// transform/filter שהיה הופך position:fixed ליחסי לאב.
//
// בעבר זה היה רכיב "inline" שכל כותרת עמוד הטמיעה בעצמה בתוך אשכול
// האייקונים שלה - וכיוון שלכל כותרת פריסה שונה (מספר אייקונים אחר, סדר
// אחר), האייקון "קפץ" למקום אחר בכל עמוד, ובעמודים שלא הטמיעו אותו בכלל
// (פרופיל, הגדרות, צ'אט AI, מסכי משפטי) הוא לא הופיע בכלל. עכשיו הוא
// mounted פעם אחת בלבד (ב-AppRouter) ומופיע/נעלם לפי הסטטוס בלבד, לא
// לפי איזה עמוד פתוח.
// מוצג רק כשיש בעיה (online = לא מרנדר כלום).
export const ConnectionStatusIcon = () => {
  const { t } = useSettings();
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
      // גובה מדויק של אייקון ההתראות בכותרת הבית: כפתורי הכותרת גובהם 44px
      // ומתחילים ב-padding-top של הכותרת עצמה (max(48px, safe-area+12px)),
      // ה-24px של אייקון החיבור (עם 4px padding = 32px קופסה) ממורכז אנכית
      // בתוך אותם 44px - +6px מקזז את ההפרש. אופקית: 16px padding + 44px
      // כפתור הגדרות + 6px gap + 44px כפתור התראות + עוד קצת מרווח מעבר
      // לצמוד-ממש (במקום 116px המדויק).
      top: 'max(54px, calc(env(safe-area-inset-top) + 18px))',
      left: 118,
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
          flexShrink: 0, lineHeight: 0,
          bgcolor: 'transparent', border: 'none', cursor: 'pointer', p: '4px', m: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex' }}>
          <WifiFadeIcon style={{ fontSize: 24, color, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
          {isOffline && pendingCount > 0 && (
            <Box sx={{
              position: 'absolute', top: -6, insetInlineEnd: -9,
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
