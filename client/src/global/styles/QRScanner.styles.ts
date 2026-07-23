import type { SxProps, Theme } from '@mui/material';
import type { CSSProperties } from 'react';

export const dialogPaperSx: SxProps<Theme> = { bgcolor: '#000' };

export const rootBoxSx: SxProps<Theme> = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' };

export const headerSx: SxProps<Theme> = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  px: 2, py: 1.5, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', zIndex: 2,
};
export const headerTitleRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1 };

export const videoAreaSx: SxProps<Theme> = { flex: 1, position: 'relative', bgcolor: '#000' };

// מסך הסכמה ראשוני - לפני פתיחת מצלמה/גלריה
export const consentOverlaySx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 2, px: 3, textAlign: 'center', color: 'white',
  bgcolor: 'rgba(0,0,0,0.92)',
  zIndex: 5,
};
export const consentDescSx: SxProps<Theme> = { fontSize: 13, color: 'rgba(255,255,255,0.8)', maxWidth: 320, lineHeight: 1.55 };
export const consentPrimaryButtonSx: SxProps<Theme> = {
  maxWidth: 320, py: 1.4, borderRadius: '14px', fontWeight: 800, fontSize: 14.5, textTransform: 'none',
  bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' },
};
export const consentSecondaryButtonSx: SxProps<Theme> = {
  maxWidth: 320, py: 1.2, borderRadius: '14px', fontWeight: 700, fontSize: 13.5, textTransform: 'none',
  color: 'white', bgcolor: 'rgba(255,255,255,0.12)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
};
export const inlineErrorChipSx: SxProps<Theme> = {
  fontSize: 12, color: '#FCA5A5', textAlign: 'center',
  bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.75, borderRadius: '10px',
  mt: 1, maxWidth: 320,
};

export const videoStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

// מסגרת עזר מרובעת במרכז המסך
export const frameOverlaySx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  pointerEvents: 'none',
};
export const frameBoxSx: SxProps<Theme> = {
  width: 240, height: 240, maxWidth: '70vw', maxHeight: '70vw',
  border: '3px solid rgba(255,255,255,0.9)',
  borderRadius: '16px',
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
  position: 'relative',
};
// 4 פינות מודגשות של מסגרת הסריקה
export const FRAME_CORNER_POSITIONS = [
  { top: -3, left: -3, borderRight: 0, borderBottom: 0 },
  { top: -3, right: -3, borderLeft: 0, borderBottom: 0 },
  { bottom: -3, left: -3, borderRight: 0, borderTop: 0 },
  { bottom: -3, right: -3, borderLeft: 0, borderTop: 0 },
] as const;
export const frameCornerSx = (pos: (typeof FRAME_CORNER_POSITIONS)[number]): SxProps<Theme> => ({
  position: 'absolute', width: 24, height: 24,
  border: '4px solid #14B8A6', borderRadius: '4px',
  ...pos,
});

// שורת סטטוס תחתונה ("כוון את ה-QR למרכז המסך")
export const bottomStatusSx: SxProps<Theme> = {
  position: 'absolute', bottom: 32, left: 0, right: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, px: 3,
};
export const statusTextSx: SxProps<Theme> = {
  fontSize: 15, fontWeight: 600, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.8)', textAlign: 'center',
};
export const galleryPillButtonSx: SxProps<Theme> = {
  bgcolor: 'rgba(255,255,255,0.92)', color: '#0F172A', borderRadius: '999px',
  px: 2.5, py: 1, fontWeight: 700, fontSize: 13.5, textTransform: 'none',
  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
};

// מסך שגיאה מלא (מצלמה נדחתה/נכשלה)
export const errorOverlaySx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', gap: 2, p: 3, bgcolor: 'rgba(0,0,0,0.85)',
};
export const errorTextSx: SxProps<Theme> = { color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 320 };
export const errorSubTextSx: SxProps<Theme> = { fontSize: 12, color: '#FCA5A5', textAlign: 'center', maxWidth: 320 };
export const errorGalleryButtonSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 700, '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
};
