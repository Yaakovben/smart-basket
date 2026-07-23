import type { SxProps, Theme } from '@mui/material';

export const menuPaperSx: SxProps<Theme> = {
  borderRadius: '16px',
  minWidth: 240,
  mt: 1,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
  py: 0.5,
  overflow: 'visible',
};

// כל פריטי התפריט (רענן/מצב קנייה/עריכה/ניקוי/איפוס/מחיקה/עזיבה) חולקים
// בדיוק את אותו ריווח - const אחד במקום לחזור על עצמו 7 פעמים.
export const menuItemSx: SxProps<Theme> = { py: 1.5, px: 2.5, gap: 1.5 };
export const menuLabelSx: SxProps<Theme> = { fontSize: 14, fontWeight: 600 };
export const dividerSx: SxProps<Theme> = { my: 0.5 };

export const muteToggleBoxSx = (isMuted: boolean, disabled: boolean): SxProps<Theme> => ({
  display: 'flex', alignItems: 'center', gap: 1.5,
  px: 2, py: 1.5,
  borderRadius: '12px',
  bgcolor: isMuted || disabled ? 'rgba(239,68,68,0.06)' : 'rgba(20,184,166,0.06)',
  border: '1px solid',
  borderColor: isMuted || disabled ? 'rgba(239,68,68,0.12)' : 'rgba(20,184,166,0.12)',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.15s ease',
  '&:active': disabled ? {} : { transform: 'scale(0.97)' },
});
export const muteToggleLabelSx = (isMuted: boolean): SxProps<Theme> => ({
  fontSize: 14, fontWeight: 600, color: isMuted ? 'error.main' : 'text.primary',
});
