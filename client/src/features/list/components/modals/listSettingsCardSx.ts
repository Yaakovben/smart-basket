// ===== סגנון משותף לשורות פעולה בהגדרות רשימה =====
// (שינוי סיסמה / הפוך למשותפת / הפוך לפרטית ב-EditListModal).
import type { SxProps, Theme } from '@mui/material';

export const settingsRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  p: 2,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  '&:active': { bgcolor: 'action.selected' },
};

export const rowLabelSx: SxProps<Theme> = { flex: 1, minWidth: 0, fontWeight: 500, fontSize: 15 };
export const rowHintSx: SxProps<Theme> = { fontSize: 12.5, color: 'text.secondary', mt: 0.25 };

// אזור ה-Collapse המורחב — אחיד בכל שלושת הכרטיסים
export const expandedAreaSx: SxProps<Theme> = {
  px: 2,
  pt: 1.5,
  pb: 2,
  bgcolor: 'action.hover',
  borderTop: '1px solid',
  borderTopColor: 'divider',
};

// שדה PIN עקבי (4 ספרות)
export const pinFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: 'background.paper',
  },
};

// כפתור פעולה ראשי קצר (שמור / אישור)
export const actionBtnSx: SxProps<Theme> = {
  minWidth: 76,
  fontSize: 13,
  fontWeight: 700,
  borderRadius: '12px',
  height: 40,
  flexShrink: 0,
};

// פס צבעוני דק בצד ה"התחלה" (ימין ב-RTL) — accent=כחול, neutral=אפור, warning=כתום
export const accentBarSx = (tone: 'accent' | 'neutral' | 'warning'): SxProps<Theme> => ({
  borderInlineStart: '3px solid',
  borderInlineStartColor:
    tone === 'accent' ? 'primary.main' :
    tone === 'warning' ? 'warning.main' :
    'divider',
});
