import { memo, useEffect, useState } from 'react';
import { Box, Typography, IconButton, keyframes } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { safeStorage } from '../../../global/helpers';

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
 * רמז עדין על תכונת "לחיצה ארוכה לבחירה מרובה".
 * קומפקטי יותר מ-SwipeHint, עם אייקון אצבע ו"טבעת החזקה" מונפשת שמדמה את
 * המחווה עצמה. נעלם פעם אחת לצמיתות אחרי שהמשתמש לוחץ X או אחרי 12 שניות
 * של היחשפות (כדי לא להישאר לעולם), עם אנימציית יציאה חלקה במקום היעלמות פתאומית.
 */
export const LongPressHint = memo(() => {
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
        gap: 1.1,
        px: 1.35,
        py: 0.8,
        mb: 1,
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(20,184,166,0.08) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.22)',
        boxShadow: '0 2px 8px rgba(139,92,246,0.08)',
        animation: `${closing ? slideOut : slideIn} ${closing ? EXIT_ANIM_MS : 350}ms ease ${closing ? '' : 'both'}`,
        overflow: 'hidden',
      }}
      role="status"
      aria-live="polite"
    >
      {/* אייקון אצבע + טבעת "מחזיקה" מתרחבת מאחוריו */}
      <Box sx={{ position: 'relative', width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <Typography sx={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: '#6D28D9', lineHeight: 1.35 }}>
        טיפ: <b>לחיצה ארוכה</b> על פריט פותחת בחירה מרובה
      </Typography>
      <IconButton
        size="small"
        onClick={dismiss}
        aria-label="הסר רמז"
        sx={{
          width: 22, height: 22, flexShrink: 0,
          color: '#8B5CF6',
          bgcolor: 'rgba(139, 92, 246, 0.1)',
          transition: 'background-color 0.15s ease, transform 0.1s ease',
          '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.18)' },
          '&:active': { transform: 'scale(0.9)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
});
LongPressHint.displayName = 'LongPressHint';
