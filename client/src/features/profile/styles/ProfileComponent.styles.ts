import type { SxProps, Theme } from '@mui/material';
import { COMMON_STYLES } from '../../../global/helpers';
import { getIconGlow, SQUIRCLE_RADIUS } from '../../../global/theme/iconArt';

export const glassButtonSx = COMMON_STYLES.glassIconButton;

export const labelSx: SxProps<Theme> = {
  ...COMMON_STYLES.label,
  fontSize: 12,
  mb: 0.75,
};

// isDark חסר היה כאן לפני התיקון - ההדר תמיד הציג את גרדיאנט המצב הבהיר
// גם במצב כהה, לא עקבי עם שאר האפליקציה.
export const headerSx = (editing: boolean, isDark: boolean): SxProps<Theme> => ({
  background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
  p: editing
    ? { xs: 'max(16px, env(safe-area-inset-top)) 16px', sm: '16px 20px' }
    : { xs: 'max(32px, env(safe-area-inset-top) + 12px) 16px 32px', sm: '32px 20px 32px' },
  textAlign: 'center',
  flexShrink: 0,
});

export const contentAreaSx = (editing: boolean): SxProps<Theme> => ({
  flex: 1, overflowY: 'auto', p: 2, pt: 2, pb: 'calc(24px + env(safe-area-inset-bottom))',
  mt: editing ? 0 : -3,
  WebkitOverflowScrolling: 'touch',
});

// glow עדין בצבע עצמו (getIconGlow, אותה פונקציה שמזינה IconTile/AvatarRing)
// כשנבחר - עקביות עם שאר האריחים הצבעוניים באפליקציה, לא רק מסגרת שטוחה.
export const colorSwatchSx = (color: string, isSelected: boolean): SxProps<Theme> => ({
  width: 36, height: 36, borderRadius: '50%',
  bgcolor: color,
  border: isSelected ? '3px solid' : '3px solid transparent',
  borderColor: isSelected ? 'text.primary' : 'transparent',
  boxShadow: isSelected ? getIconGlow(color) : 'none',
  cursor: 'pointer',
  transition: 'transform 0.15s, box-shadow 0.15s',
  '&:hover': { transform: 'scale(1.1)' },
});

// אותה "סקוויקל" (SQUIRCLE_RADIUS) כמו IconTile - היו ריבועים רגילים,
// שפה צורנית שונה משאר האפליקציה. נבחר = רקע גרדיאנט טורקיז עדין + glow,
// לא סתם primary.light שטוח.
export const emojiSwatchSx = (isSelected: boolean): SxProps<Theme> => ({
  width: 42, height: 42, borderRadius: SQUIRCLE_RADIUS,
  border: isSelected ? '2px solid' : '1.5px solid',
  borderColor: isSelected ? 'primary.main' : 'divider',
  background: isSelected
    ? 'linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(13,148,136,0.1) 100%)'
    : 'transparent',
  bgcolor: isSelected ? undefined : 'background.paper',
  boxShadow: isSelected ? '0 3px 10px rgba(20,184,166,0.25)' : 'none',
  fontSize: 22, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
  '&:hover': { borderColor: 'primary.main' },
});

// כרטיס מידע (View Mode) - אותה שפה צורנית כמו כרטיסי ה-Settings
// (Paper מעוגל + שורות עם קו מפריד) כדי שהמסך "יתאים לאפליקציה" במקום
// להיראות כמו מסך נפרד עם שפה משלו.
export const infoCardSx: SxProps<Theme> = {
  borderRadius: '16px', overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};
export const infoRowSx: SxProps<Theme> = {
  display: 'flex', alignItems: 'center', gap: 1.5, p: 2,
  borderBottom: '1px solid', borderColor: 'divider',
};
export const lastInfoRowSx: SxProps<Theme> = { ...infoRowSx, borderBottom: 'none' };
export const infoIconSx: SxProps<Theme> = {
  width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, bgcolor: 'rgba(20,184,166,0.1)',
};
export const infoTextSx: SxProps<Theme> = {
  flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 500,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

// שורת "התנתקות" - אותה שורת-סכנה מ-Settings (dangerSettingRowSx) בתוך
// אותו Paper מעוגל, במקום כפתור-גלולה גדול שלא מתאים לשאר האפליקציה.
export const logoutRowSx = (isDark: boolean): SxProps<Theme> => ({
  ...lastInfoRowSx,
  cursor: 'pointer',
  color: isDark ? '#FCA5A5' : '#DC2626',
  transition: 'background-color 0.15s ease',
  '&:active': { bgcolor: 'action.selected' },
});
