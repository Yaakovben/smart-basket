import { memo, useEffect, useState } from 'react';
import { Box, Typography, IconButton, keyframes } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const HINT_KEY = 'sb_longpress_hint_seen';

// פעימה עדינה של האצבע - רמז ויזואלי חלש ל"לחיצה ארוכה"
const pulseFinger = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.15); opacity: 1; }
`;

/**
 * רמז עדין על תכונת "לחיצה ארוכה לבחירה מרובה".
 * קומפקטי יותר מ-SwipeHint, עם אייקון אצבע מפעם מתכנס. נעלם פעם אחת לצמיתות
 * אחרי שהמשתמש לוחץ X או אחרי 12 שניות של היחשפות (כדי לא להישאר לעולם).
 */
export const LongPressHint = memo(() => {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(HINT_KEY) !== 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (!show) return;
    // נעלם אוטומטית אחרי 12 שניות — המשתמש לא חייב ללחוץ X
    const timer = window.setTimeout(() => dismiss(), 12_000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(HINT_KEY, 'true'); } catch { /* בטוח */ }
  };

  if (!show) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.75,
        mb: 1,
        borderRadius: '10px',
        bgcolor: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}
      role="status"
      aria-live="polite"
    >
      {/* אייקון אצבע מפעם */}
      <Typography
        sx={{ fontSize: 16, animation: `${pulseFinger} 1.6s ease-in-out infinite`, lineHeight: 1 }}
        aria-hidden="true"
      >
        👆
      </Typography>
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
          '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.18)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
});
LongPressHint.displayName = 'LongPressHint';
