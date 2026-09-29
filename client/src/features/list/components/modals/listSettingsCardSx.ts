// ===== סגנון משותף לשורות פעולה בהגדרות רשימה =====
// (שינוי סיסמה / הפוך למשותפת / הפוך לפרטית ב-EditListModal).
// צבע המותג בכל הפעולות: רקע עדין, ריבוע לאייקון, מסגרת ושדה קוד.
import type { SxProps, Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';

// צבע אחיד לכל הפעולות: הטורקיז הראשי של האפליקציה. האייקונים והכותרות כבר
// מבדילים בין הקטעים, וצבע שונה לכל אחד רק הוסיף רעש.
const BRAND_ACCENT = '#14B8A6';
export const SETTINGS_ACCENTS = {
  password: BRAND_ACCENT,
  group: BRAND_ACCENT,
  private: BRAND_ACCENT,
} as const;

// כרטיס עם רקע עדין בצבע הפעולה, ומסגרת שמתחזקת כשהקטע פתוח
export const settingsCardSx = (accent: string, open = false, mb = 0): SxProps<Theme> => (theme) => ({
  position: 'relative',
  borderRadius: '16px',
  overflow: 'hidden',
  mt: 2.5,
  mb,
  border: '1px solid',
  borderColor: alpha(accent, open ? 0.5 : 0.25),
  background: `linear-gradient(135deg, ${alpha(accent, theme.palette.mode === 'dark' ? 0.16 : 0.09)} 0%, ${alpha(accent, 0.02)} 100%)`,
  boxShadow: open ? `0 4px 14px ${alpha(accent, 0.18)}` : 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
});

// ריבוע צבעוני סביב האייקון
export const settingsIconBoxSx = (accent: string): SxProps<Theme> => ({
  width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 21, bgcolor: alpha(accent, 0.16),
});

// שדה הקוד מקבל את צבע הפעולה במסגרת כשמקלידים בו
export const accentPinFieldSx = (accent: string): SxProps<Theme> => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: 'background.paper',
    '& fieldset': { borderColor: alpha(accent, 0.35) },
    '&.Mui-focused fieldset': { borderColor: accent, borderWidth: 2 },
  },
});

// מחיצה בין הכותרת לאזור הנפתח, בצבע הפעולה
export const accentExpandedAreaSx = (accent: string): SxProps<Theme> => ({
  px: 2, pt: 1.5, pb: 2,
  borderTop: '1px solid',
  borderTopColor: alpha(accent, 0.25),
});

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

export const rowLabelSx: SxProps<Theme> = { flex: 1, minWidth: 0, fontWeight: 600, fontSize: 15 };
export const rowHintSx: SxProps<Theme> = { fontSize: 12.5, color: 'text.secondary', mt: 0.25 };
