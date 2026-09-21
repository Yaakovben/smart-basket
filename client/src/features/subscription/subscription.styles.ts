import type { SxProps, Theme } from '@mui/material';

export const PRO_PURPLE = '#7C3AED';
export const PRO_PURPLE_DARK = '#5B21B6';
export const PRO_GOLD = '#FCD34D';

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
};

export const ghostCtaSx: SxProps<Theme> = {
  borderRadius: '12px', textTransform: 'none', fontWeight: 600, fontSize: 13.5,
  color: 'text.secondary',
};
