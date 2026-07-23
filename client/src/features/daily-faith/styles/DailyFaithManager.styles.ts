import type { SxProps, Theme } from '@mui/material';

// צביעה זהובה עקבית לכל ה-inputs (תואם לצבע של משפטי החיזוק)
export const goldFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: 'rgba(212,175,55,0.05)',
    '& fieldset': { borderColor: 'rgba(184,134,11,0.25)' },
    '&:hover fieldset': { borderColor: 'rgba(184,134,11,0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#B8860B', borderWidth: '1.5px' },
  },
};
// גרסת goldFieldSx עם רקע לבן (background.paper) - לשדה ההוספה הראשי
export const goldFieldOnPaperSx: SxProps<Theme> = {
  ...goldFieldSx,
  '& .MuiOutlinedInput-root': {
    ...(goldFieldSx['& .MuiOutlinedInput-root'] as object),
    bgcolor: 'background.paper',
  },
};

export const modalBodySx: SxProps<Theme> = {
  display: 'flex', flexDirection: 'column', gap: 1.5, height: 'min(70vh, 580px)',
};

export const statsRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1, px: 0.25, flexShrink: 0 };
export const statsBadgeSx = (isDark: boolean): SxProps<Theme> => ({
  display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, borderRadius: '8px',
  bgcolor: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.1)',
  border: '1px solid rgba(184,134,11,0.25)',
});

export const searchToggleBtnSx = (searchOpen: boolean, isDark: boolean): SxProps<Theme> => ({
  width: 30, height: 30,
  color: searchOpen ? '#8B6914' : 'text.secondary',
  bgcolor: searchOpen
    ? (isDark ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.14)')
    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
  border: '1px solid',
  borderColor: searchOpen ? 'rgba(184,134,11,0.4)' : 'transparent',
  '&:hover': { bgcolor: isDark ? 'rgba(212,175,55,0.14)' : 'rgba(212,175,55,0.1)' },
});

// כרטיס הוספת משפט חדש - מסגרת זהב עדינה
export const addCardSx: SxProps<Theme> = {
  flexShrink: 0, p: 1.25, borderRadius: '14px',
  background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(184,134,11,0.03))',
  border: '1px solid', borderColor: 'rgba(184,134,11,0.2)',
};
export const addCardHeaderSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.75, px: 0.25 };
export const addCardTitleSx: SxProps<Theme> = { fontSize: 12.5, fontWeight: 800, color: '#8B6914', letterSpacing: 0.3 };

export const formatTipSx: SxProps<Theme> = { fontSize: 10.5, color: 'text.disabled', mt: 0.75, px: 0.25, lineHeight: 1.45 };
export const formatTipCodeSx: SxProps<Theme> = { fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.4, borderRadius: '3px' };

export const helpButtonSx = (active: boolean): SxProps<Theme> => ({
  width: 28, height: 28, flexShrink: 0,
  color: active ? '#8B6914' : 'text.disabled',
  bgcolor: active ? 'rgba(212,175,55,0.14)' : 'transparent',
  border: '1px solid',
  borderColor: active ? 'rgba(184,134,11,0.35)' : 'transparent',
  transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  '&:hover': { bgcolor: 'rgba(212,175,55,0.1)' },
});

export const addButtonSx = (isDark: boolean): SxProps<Theme> => ({
  minWidth: 110, height: 38, borderRadius: '10px', textTransform: 'none', fontWeight: 800, fontSize: 13,
  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
  boxShadow: '0 3px 12px rgba(184,134,11,0.35)',
  '&:hover': { background: 'linear-gradient(135deg, #B8860B, #9C7209)', boxShadow: '0 4px 14px rgba(184,134,11,0.45)' },
  '&.Mui-disabled': {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    color: 'text.disabled',
  },
  '& .MuiButton-startIcon': { marginInlineStart: 0, marginInlineEnd: '4px' },
});

// רשימת משפטים - גלילה עם פייד עדין בקצוות + scrollbar דק
export const listScrollBoxSx: SxProps<Theme> = {
  display: 'flex', flexDirection: 'column', gap: 0.85,
  flex: 1, minHeight: 0,
  overflowY: 'auto',
  pr: 0.5, pl: 0.25,
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
  scrollBehavior: 'smooth',
  maskImage: 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
  '&::-webkit-scrollbar': { width: '6px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(184,134,11,0.25)', borderRadius: '3px',
    '&:hover': { background: 'rgba(184,134,11,0.45)' },
  },
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(184,134,11,0.3) transparent',
  pt: '2px',
};

export const sentenceRowSx = (isDark: boolean): SxProps<Theme> => ({
  display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25, borderRadius: '12px',
  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
  border: '1px solid',
  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
});
export const sentenceNumberSx = (isDark: boolean): SxProps<Theme> => ({
  flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  bgcolor: isDark ? 'rgba(184,134,11,0.2)' : 'rgba(184,134,11,0.12)',
  color: '#8B6914', fontSize: 10.5, fontWeight: 800,
  fontVariantNumeric: 'tabular-nums', mt: 0.2,
});
export const sentenceTextSx: SxProps<Theme> = {
  fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'text.primary',
};
export const sentenceMetaRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' };
export const sentenceMetaTextSx: SxProps<Theme> = { fontSize: 10, color: 'text.disabled' };
export const sentenceMetaTabularSx: SxProps<Theme> = { fontSize: 10, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' };
export const deleteButtonSx: SxProps<Theme> = {
  color: 'text.secondary', flexShrink: 0,
  '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' },
};
