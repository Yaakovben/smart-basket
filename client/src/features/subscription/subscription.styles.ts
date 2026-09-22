import type { SxProps, Theme } from '@mui/material';

export const PRO_PURPLE = '#7C3AED';
export const PRO_PURPLE_DARK = '#5B21B6';
// גוון סגול בהיר לתגים/רקעים עדינים (לא זהב) - כל צבעי המינוי מגיעים ממשפחת הסגול
export const PRO_SOFT = '#EDE9FE';
export const PRO_LILAC = '#C4B5FD';

export const cardSx = (isDark: boolean): SxProps<Theme> => ({
  bgcolor: 'background.paper',
  borderRadius: '18px',
  border: '1px solid',
  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
  boxShadow: isDark ? 'none' : '0 1px 3px rgba(15,23,42,0.05)',
  p: 2.25,
});

export const sectionLabelSx: SxProps<Theme> = {
  fontSize: 12, fontWeight: 700, color: 'text.secondary',
  letterSpacing: 0.3, mb: 1.25,
};

// כפתור שקט ובטוח: צבע אחיד, בלי הברקה חוזרת-לנצח - זה נראה "נדחף" יותר
// משהוא עוזר. תשומת לב מגיעה מהצבע והמשקל, לא מתנועה מתמשכת.
export const primaryCtaSx: SxProps<Theme> = {
  borderRadius: '14px', fontWeight: 800, fontSize: 15.5, py: 1.35,
  textTransform: 'none',
  bgcolor: PRO_PURPLE,
  boxShadow: 'none',
  color: '#fff',
  transition: 'background-color 0.15s ease',
  '&:hover': { bgcolor: PRO_PURPLE_DARK, boxShadow: 'none' },
  '&:active': { transform: 'scale(0.985)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)', opacity: 0.65 },
};

export const ghostCtaSx: SxProps<Theme> = {
  borderRadius: '12px', textTransform: 'none', fontWeight: 600, fontSize: 13.5,
  color: 'text.secondary',
};

// כניסה מדורגת של כרטיסים: עלייה קלה + fade. delay מדורג לפי סדר הכרטיס.
export const revealSx = (index: number): SxProps<Theme> => ({
  animation: `sbReveal 0.5s ${Math.min(index, 8) * 70}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  '@keyframes sbReveal': {
    from: { opacity: 0, transform: 'translateY(14px) scale(0.985)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});
