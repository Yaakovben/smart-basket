import { memo, useEffect, useState } from 'react';
import { Box, Typography, IconButton, keyframes } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { safeStorage } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

const HINT_KEY = 'sb_longpress_hint_seen';
const EXIT_ANIM_MS = 250;

// טבעת "מחזיקה" שמתרחבת ודועכת סביב האצבע - מדמה בפועל את מחוות ה-touch
// & hold, לא רק פעימת קנה-מידה גנרית. בלולאה, כך שתמיד יש טבעת אחת בדרך
// להיעלם ואחת חדשה מתחילה - נראה כמו "לחיצה" חוזרת ונשנית.
const holdRing = keyframes`
  0%   { transform: scale(0.4); opacity: 0.7; }
  70%  { opacity: 0.15; }
  100% { transform: scale(1.9); opacity: 0; }
`;
const fingerTap = keyframes`
  0%, 15%  { transform: scale(1); }
  30%      { transform: scale(0.88); }
  55%, 100% { transform: scale(1); }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: none; }
`;
const slideOut = keyframes`
  from { opacity: 1; transform: none; max-height: 60px; }
  to   { opacity: 0; transform: translateY(-6px) scale(0.97); max-height: 0; }
`;

/**
 * רמז על תכונת "לחיצה ארוכה לבחירה מרובה", באותה משפחה חזותית של SwipeHint
 * (גודל/מבנה דומים) עם גרדיאנט סגול→טורקיז ואייקון אצבע ו"טבעת החזקה"
 * מונפשת שמדמה את המחווה עצמה. נעלם פעם אחת לצמיתות אחרי שהמשתמש לוחץ X או אחרי 12 שניות
 * של היחשפות (כדי לא להישאר לעולם), עם אנימציית יציאה חלקה במקום היעלמות פתאומית.
 */
export const LongPressHint = memo(() => {
  const { t } = useSettings();
  const [show, setShow] = useState(() => safeStorage.get(HINT_KEY) !== 'true');
  const [closing, setClosing] = useState(false);

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    safeStorage.set(HINT_KEY, 'true');
    window.setTimeout(() => setShow(false), EXIT_ANIM_MS);
  };

  useEffect(() => {
    if (!show || closing) return;
    // נעלם אוטומטית אחרי 12 שניות — המשתמש לא חייב ללחוץ X
    const timer = window.setTimeout(() => dismiss(), 12_000);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, closing]);

  if (!show) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: '12px 16px',
        mb: 1.5,
        borderRadius: '14px',
        // גרדיאנט סגול→טורקיז - אותה משפחת "AI/פיצ׳ר חדש" שמופיעה בבאדג׳ים
        // ובאייקון העוזר החכם, כדי שהרמז ירגיש שייך למותג ולא כתם סגול מבודד
        background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(20,184,166,0.1) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.28)',
        boxShadow: '0 2px 8px rgba(139,92,246,0.1)',
        position: 'relative',
        animation: `${closing ? slideOut : slideIn} ${closing ? EXIT_ANIM_MS : 350}ms ease ${closing ? '' : 'both'}`,
        overflow: 'hidden',
      }}
      role="status"
      aria-live="polite"
    >
      {/* קופסת אייקון בגודל תואם ל-SwipeHint, עם רקע גרדיאנט; בפנים - אותה
          טבעת "מחזיקה" עגולה מתרחבת + אצבע, ללא שינוי בצורתן/באנימציה שלהן */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(20,184,166,0.16) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1.5px solid #8B5CF6',
              animation: `${holdRing} 1.8s ease-out infinite`,
            }}
          />
          <Typography
            sx={{ fontSize: 16, lineHeight: 1, animation: `${fingerTap} 1.8s ease-in-out infinite`, transformOrigin: 'center' }}
            aria-hidden="true"
          >
            👆
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#6D28D9', lineHeight: 1.4 }}>
        {t('longPressMultiSelectHint')}
      </Typography>
      <IconButton
        size="small"
        onClick={dismiss}
        aria-label={t('dismissHint')}
        sx={{
          width: 28, height: 28, flexShrink: 0,
          color: '#8B5CF6',
          bgcolor: 'rgba(139, 92, 246, 0.12)',
          transition: 'background-color 0.15s ease, transform 0.1s ease',
          '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' },
          '&:active': { transform: 'scale(0.9)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
});
LongPressHint.displayName = 'LongPressHint';
