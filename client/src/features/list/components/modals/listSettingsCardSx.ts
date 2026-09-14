// ===== סגנון משותף לשורות פעולה בהגדרות רשימה =====
// (שינוי סיסמה / הפוך למשותפת / הפוך לפרטית ב-EditListModal).
// עיצוב זהה לשורות ההגדרות הראשיות של האפליקציה (SettingsComponent.styles.ts).
import type { SxProps, Theme } from '@mui/material';

// שורת כותרת — זהה ל-settingRowSx של SettingsComponent
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

// אזור ה-Collapse: אינדנטציה כמו subSettingRowSx + מחיצה עליונה
export const expandedAreaSx: SxProps<Theme> = {
  px: 2,
  pt: 1.5,
  pb: 2,
  borderTop: '1px solid',
  borderTopColor: 'divider',
};

// שדה PIN (4 ספרות)
export const pinFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: 'action.hover',
  },
};

// כפתור פעולה ראשי קצר
export const actionBtnSx: SxProps<Theme> = {
  minWidth: 76,
  fontSize: 13,
  fontWeight: 700,
  borderRadius: '12px',
  height: 40,
  flexShrink: 0,
};
