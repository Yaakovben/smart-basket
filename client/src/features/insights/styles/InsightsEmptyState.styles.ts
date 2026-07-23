import type { SxProps, Theme } from '@mui/material';
import { fadeIn } from '../components/shared/animations';

// מיקומי 4 הפריטים המרחפים סביב האייקון המרכזי (קבועים, לא תלויי props)
export const FLOATING_ITEM_POSITIONS = [
  { top: '8%', left: '8%' },
  { top: '10%', left: '78%' },
  { top: '70%', left: '6%' },
  { top: '68%', left: '78%' },
] as const;

export const containerSx: SxProps<Theme> = {
  textAlign: 'center', py: { xs: 3, sm: 4 }, px: 2,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  animation: `${fadeIn} 0.5s ease`,
};

// כרטיס מכיל - רקע/מסגרת תלויים ב-accent ו-isDark, לכן פונקציה ולא אובייקט קבוע
export const cardSx = (accent: string, isDark: boolean): SxProps<Theme> => ({
  width: '100%', maxWidth: 360,
  p: { xs: 2.5, sm: 3 }, borderRadius: '20px',
  bgcolor: isDark ? `${accent}08` : `${accent}06`,
  border: '1px solid',
  borderColor: isDark ? `${accent}22` : `${accent}18`,
  boxShadow: isDark
    ? `0 8px 24px ${accent}10`
    : `0 8px 24px ${accent}10, inset 0 1px 0 rgba(255,255,255,0.5)`,
});

export const iconWrapperSx: SxProps<Theme> = {
  position: 'relative', width: 160, height: 160, mx: 'auto', mb: 2,
};

export const haloSx = (accent: string, isDark: boolean): SxProps<Theme> => ({
  position: 'absolute', inset: 0, borderRadius: '50%',
  background: isDark
    ? `radial-gradient(circle at center, ${accent}40, ${accent}08 70%)`
    : `radial-gradient(circle at center, ${accent}30, ${accent}05 70%)`,
  animation: 'iesPulse 3s ease-in-out infinite',
  '@keyframes iesPulse': {
    '0%, 100%': { transform: 'scale(1)', opacity: 0.7 },
    '50%': { transform: 'scale(1.1)', opacity: 1 },
  },
});

export const iconFloatSx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 68,
  animation: 'iesFloat 3s ease-in-out infinite',
  '@keyframes iesFloat': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-8px)' },
  },
};

// פריט מרחף בודד - התזמון תלוי באינדקס (סטגר), המיקום נלקח מ-FLOATING_ITEM_POSITIONS
export const floatingItemSx = (index: number): SxProps<Theme> => ({
  position: 'absolute',
  fontSize: 20,
  top: FLOATING_ITEM_POSITIONS[index]?.top,
  left: FLOATING_ITEM_POSITIONS[index]?.left,
  animation: `iesItem 2.8s ease-in-out ${index * 0.3}s infinite`,
  '@keyframes iesItem': {
    '0%, 100%': { transform: 'translateY(0) rotate(-5deg)', opacity: 0.85 },
    '50%': { transform: 'translateY(-10px) rotate(5deg)', opacity: 1 },
  },
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
});

export const titleSx: SxProps<Theme> = { fontSize: 17, fontWeight: 800, mb: 0.75, color: 'text.primary' };

export const descriptionSx: SxProps<Theme> = {
  fontSize: 13, color: 'text.secondary', maxWidth: 300, mx: 'auto', lineHeight: 1.55,
};

export const tipsContainerSx: SxProps<Theme> = {
  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75, mt: 2,
};

export const tipChipSx = (accent: string, isDark: boolean): SxProps<Theme> => ({
  px: 1.25, py: 0.5, borderRadius: '999px',
  fontSize: 10.5, fontWeight: 700,
  color: accent,
  bgcolor: isDark ? `${accent}1A` : `${accent}10`,
  border: '1px solid',
  borderColor: isDark ? `${accent}33` : `${accent}22`,
});

export const ctaButtonSx = (accent: string): SxProps<Theme> => ({
  mt: 2.25,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1,
  px: 2.5, py: 1.1,
  borderRadius: '12px',
  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
  color: 'white',
  fontSize: 14, fontWeight: 800,
  boxShadow: `0 6px 18px ${accent}50`,
  cursor: 'pointer', userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  transition: 'transform 0.15s, box-shadow 0.2s',
  '&:hover': { boxShadow: `0 8px 24px ${accent}66` },
  '&:active': { transform: 'scale(0.97)' },
});
