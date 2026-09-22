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

export const primaryCtaSx: SxProps<Theme> = {
  position: 'relative', overflow: 'hidden',
  borderRadius: '14px', fontWeight: 800, fontSize: 15.5, py: 1.35,
  textTransform: 'none',
  background: `linear-gradient(135deg, ${PRO_PURPLE} 0%, ${PRO_PURPLE_DARK} 100%)`,
  boxShadow: '0 8px 22px rgba(124,58,237,0.38)',
  color: '#fff',
  '&:hover': { background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' },
  '&:active': { transform: 'scale(0.985)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)', opacity: 0.65 },
  // ברק עדין שעובר על הכפתור - מזמין ללחיצה בלי להציק
  '&:not(.Mui-disabled)::after': {
    content: '""', position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.32) 50%, transparent 68%)',
    backgroundSize: '260% 100%',
    animation: 'sbCtaShine 3.6s ease-in-out infinite',
  },
  '@keyframes sbCtaShine': {
    '0%, 55%': { backgroundPosition: '160% 0' },
    '100%': { backgroundPosition: '-160% 0' },
  },
  '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' } },
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
