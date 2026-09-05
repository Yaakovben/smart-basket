import { keyframes, type SxProps, type Theme } from '@mui/material';

// אנימציות למסך 'מעדכן גרסה' - תחושת שדרוג עליז: רקטה שעולה, נקודות פסים
// מתפצלות מטה לתחושת מהירות, ופעימת halo מאחור.
export const rocketRise = keyframes`
  0%   { transform: translateY(0) rotate(-4deg); }
  50%  { transform: translateY(-10px) rotate(0deg); }
  100% { transform: translateY(0) rotate(4deg); }
`;
export const haloPulse = keyframes`
  0%, 100% { transform: scale(0.92); opacity: 0.55; }
  50%      { transform: scale(1.08); opacity: 0.9; }
`;
export const progressSlide = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(220%); }
`;

// ===== מסך "מעדכן גרסה" (isReloading) =====
export const reloadingScreenSx: SxProps<Theme> = {
  position: 'fixed', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: '#14B8A6',
  color: '#fff',
  zIndex: 99999,
  overflow: 'hidden',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
};

export const reloadingHaloSx: SxProps<Theme> = {
  position: 'absolute',
  width: 240, height: 240,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.10)',
  animation: `${haloPulse} 2.8s ease-in-out infinite`,
};

export const reloadingRocketSx: SxProps<Theme> = {
  fontSize: 84,
  lineHeight: 1,
  filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))',
  animation: `${rocketRise} 2.4s ease-in-out infinite`,
  mb: 4,
  position: 'relative',
  zIndex: 1,
};

export const reloadingTitleSx: SxProps<Theme> = {
  fontSize: 20, fontWeight: 800, mb: 0.5,
  textShadow: '0 2px 8px rgba(0,0,0,0.18)',
  letterSpacing: 0.3,
  position: 'relative', zIndex: 1,
};

export const reloadingSubtitleSx: SxProps<Theme> = {
  fontSize: 12.5, fontWeight: 500,
  color: 'rgba(255,255,255,0.85)',
  textAlign: 'center', lineHeight: 1.5,
  position: 'relative', zIndex: 1,
};

export const reloadingProgressTrackSx: SxProps<Theme> = {
  position: 'absolute',
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(60%, 240px)',
  height: 3,
  borderRadius: 999,
  bgcolor: 'rgba(255,255,255,0.22)',
  overflow: 'hidden',
};

export const reloadingProgressBarSx: SxProps<Theme> = {
  position: 'absolute',
  top: 0, left: 0,
  width: '40%', height: '100%',
  borderRadius: 999,
  bgcolor: '#fff',
  animation: `${progressSlide} 1.6s ease-in-out infinite`,
};

// ===== מסך שגיאה כללי =====
export const errorScreenSx: SxProps<Theme> = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  p: 3,
  textAlign: 'center',
  bgcolor: 'background.default',
  overflow: 'auto',
};

export const errorIconCircleSx: SxProps<Theme> = {
  width: 80,
  height: 80,
  borderRadius: '20px',
  bgcolor: 'rgba(239, 68, 68, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  mb: 3,
  fontSize: 40,
};

export const errorTitleSx: SxProps<Theme> = { fontWeight: 700, color: 'text.primary', mb: 1 };
export const errorDescSx: SxProps<Theme> = { color: 'text.secondary', mb: 3, maxWidth: 300 };

export const actionsColumnSx: SxProps<Theme> = {
  display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, width: '100%', maxWidth: 300,
};
export const actionsRowSx: SxProps<Theme> = { display: 'flex', gap: 2 };
// כפתורי "נסה שוב"/"רענן דף" - זהים בעיצוב, רק ה-variant (outlined/contained) משתנה בקומפוננטה
export const actionButtonSx: SxProps<Theme> = { borderRadius: '12px', px: 3, flex: 1 };
export const dangerButtonSx: SxProps<Theme> = {
  borderRadius: '12px', px: 3, bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' },
};

export const toggleDetailsBtnSx: SxProps<Theme> = { color: 'text.secondary', fontSize: 13, mb: 1 };

export const detailsBoxSx: SxProps<Theme> = {
  bgcolor: 'rgba(0,0,0,0.05)',
  borderRadius: '12px',
  p: 2,
  maxWidth: 320,
  width: '100%',
  textAlign: 'left',
  mb: 2,
};
export const detailsErrorTextSx: SxProps<Theme> = {
  fontSize: 12, color: 'error.main', fontFamily: 'monospace', wordBreak: 'break-word',
};
export const detailsStackTextSx: SxProps<Theme> = {
  fontSize: 10, color: 'text.secondary', fontFamily: 'monospace', mt: 1, maxHeight: 100, overflow: 'auto', wordBreak: 'break-word',
};
export const detailsButtonsRowSx: SxProps<Theme> = { display: 'flex', gap: 1, mt: 1.5, justifyContent: 'center', flexWrap: 'wrap' };
export const copyBtnSx: SxProps<Theme> = { fontSize: 12, borderRadius: '8px' };
export const copyHintSx: SxProps<Theme> = { fontSize: 11, color: 'text.secondary', mt: 1 };

// קישור "צור קשר עם תמיכה" - תמיד גלוי (לא רק בתוך "הצג פרטי שגיאה"),
// כדי שמישהו שנתקע לגמרי ידע שיש למי לפנות בלי לחפור בפרטים טכניים.
export const supportLinkSx: SxProps<Theme> = {
  fontSize: 12.5, color: '#0D9488', fontWeight: 600, textDecoration: 'none',
  mb: 2,
  '&:hover': { textDecoration: 'underline' },
};
