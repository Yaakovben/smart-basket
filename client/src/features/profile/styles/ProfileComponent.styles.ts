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

// isDark חסר היה גם כאן (אותו באג כמו headerSx) - כתום כהה על טקסט אדום
// כהה על רקע כהה כללי של האפליקציה היה בניגודיות גרועה/כמעט בלתי קריא.
export const logoutButtonSx = (isDark: boolean): SxProps<Theme> => ({
  mt: 2.5, py: 1.5, borderRadius: '12px',
  bgcolor: isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2',
  color: isDark ? '#FCA5A5' : '#DC2626',
  fontWeight: 600, fontSize: 15, gap: 1,
  '&:hover': { bgcolor: isDark ? 'rgba(220,38,38,0.22)' : '#FECACA' },
});
