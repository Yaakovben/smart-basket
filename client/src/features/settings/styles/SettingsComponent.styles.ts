import type { SxProps, Theme } from '@mui/material';
import { COMMON_STYLES } from '../../../global/constants';

export const glassButtonSx = COMMON_STYLES.glassIconButton;

export const settingRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  p: 2,
  borderBottom: '1px solid',
  borderColor: 'divider',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  '&:active': { bgcolor: 'action.selected' },
};
// שורת settings אחרונה בכרטיס - בלי קו תחתון
export const lastSettingRowSx: SxProps<Theme> = { ...settingRowSx, borderBottom: 'none' };
// שורת "מחק את כל הנתונים" - כמו lastSettingRowSx אבל בצבע אזהרה
export const dangerSettingRowSx: SxProps<Theme> = { ...settingRowSx, borderBottom: 'none', color: 'error.dark' };

export const subSettingRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.5,
  p: '12px 16px 12px 48px',
  borderBottom: '1px solid',
  borderColor: 'divider',
};
export const lastSubSettingRowSx: SxProps<Theme> = { ...subSettingRowSx, borderBottom: 'none' };

export const switchSx: SxProps<Theme> = {
  width: 52,
  height: 32,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: '4px',
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': { backgroundColor: '#14B8A6', opacity: 1, border: 0 },
    },
  },
  '& .MuiSwitch-thumb': { boxSizing: 'border-box', width: 24, height: 24, backgroundColor: 'background.paper' },
  '& .MuiSwitch-track': { borderRadius: 16, backgroundColor: 'action.disabled', opacity: 1 },
};

export const smallSwitchSx: SxProps<Theme> = {
  width: 44,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: '3px',
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(18px)',
      color: '#fff',
      '& + .MuiSwitch-track': { backgroundColor: '#14B8A6', opacity: 1, border: 0 },
    },
  },
  '& .MuiSwitch-thumb': { boxSizing: 'border-box', width: 20, height: 20, backgroundColor: 'background.paper' },
  '& .MuiSwitch-track': { borderRadius: 13, backgroundColor: 'action.disabled', opacity: 1 },
};

// תווית שורת הגדרה ראשית - חוזר על עצמו בכל שורות ה-settingRowSx
export const rowLabelSx: SxProps<Theme> = { flex: 1, fontWeight: 500, fontSize: 15 };
// תווית שורת תת-הגדרה - חוזר על עצמו בכל שורות ה-subSettingRowSx
export const subRowLabelSx: SxProps<Theme> = { flex: 1, fontSize: 14 };

export const headerSx = (isDark: boolean): SxProps<Theme> => ({
  background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
  p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 24px', sm: '48px 20px 24px' },
  flexShrink: 0,
});

// כותרת קבוצת התראות מתקפלת (push/group/product) - זהה בשלושתן, רק צבע האייקון משתנה
export const sectionHeaderRowSx: SxProps<Theme> = {
  display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, mb: 0.5, cursor: 'pointer',
};
export const sectionHeaderRowWithMtSx: SxProps<Theme> = { ...sectionHeaderRowSx, mt: 0.5 };
export const sectionLabelSx: SxProps<Theme> = { flex: 1, fontSize: 13, fontWeight: 600, color: 'text.secondary' };
export const sectionCountBadgeSx: SxProps<Theme> = { fontSize: 12, fontWeight: 600, color: 'text.disabled', minWidth: 28, textAlign: 'center' };
export const sectionDividerSx: SxProps<Theme> = { height: '1px', bgcolor: 'divider', mx: 2, my: 1 };

// עיגול אייקון של קבוצת התראות - הרקע (light/dark) הוא הדבר היחיד שמשתנה בין שלושתן
export const sectionIconBadgeSx = (isDark: boolean, bgLight: string, bgDark: string): SxProps<Theme> => ({
  width: 28, height: 28, borderRadius: '8px',
  bgcolor: isDark ? bgDark : bgLight,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
});

export const pushActiveBadgeSx = (isDark: boolean): SxProps<Theme> => ({
  display: 'flex', alignItems: 'center', gap: 0.5,
  bgcolor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
  borderRadius: '8px', px: 1, py: 0.25,
});

export const installHintBoxSx = (isDark: boolean): SxProps<Theme> => ({
  mt: 1, p: 1.5, bgcolor: isDark ? 'rgba(245,158,11,0.12)' : '#FEF3C7', borderRadius: '10px',
});
export const installHintTitleSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 12, fontWeight: 600, color: isDark ? '#FCD34D' : '#92400E', mb: 0.5,
});
export const installHintBodySx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.6, whiteSpace: 'pre-line',
});

// כרטיס "עדכון זמין" - גרדיאנט תואם לכותרת העליונה
export const updateCardSx = (isDark: boolean): SxProps<Theme> => ({
  borderRadius: '16px', overflow: 'hidden', mt: 2, cursor: 'pointer',
  background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
  '&:active': { transform: 'scale(0.97)', opacity: 0.9 },
  transition: 'transform 0.15s, opacity 0.15s',
  boxShadow: '0 4px 16px rgba(20, 184, 166, 0.3)',
});
export const updateCardIconSx: SxProps<Theme> = {
  width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
};

// כפתור שפה - מודגש כשנבחר
export const languageButtonSx = (isSelected: boolean): SxProps<Theme> => ({
  justifyContent: 'flex-start', p: 2, borderRadius: '12px',
  border: isSelected ? '2px solid' : '1.5px solid',
  borderColor: isSelected ? 'primary.main' : 'divider',
  bgcolor: isSelected ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
  textTransform: 'none',
  '&:hover': { bgcolor: isSelected ? 'rgba(20, 184, 166, 0.15)' : 'action.hover' },
});
export const languageTextAlignSx = (isHebrew: boolean): SxProps<Theme> => ({
  flex: 1, textAlign: isHebrew ? 'right' : 'left',
});

// תוכן מודל "אודות" ו"עזרה" - מבנה עיגול-אייקון + כותרת + תיאור זהה בשניהם
export const modalContentSx: SxProps<Theme> = { textAlign: 'center', py: 2 };
export const aboutIconCircleSx: SxProps<Theme> = {
  width: 80, height: 80, borderRadius: '20px',
  background: 'linear-gradient(135deg, #14B8A6, #10B981)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  mx: 'auto', mb: 2, fontSize: 40, boxShadow: '0 8px 24px rgba(20, 184, 166, 0.3)',
};
export const helpIconCircleSx: SxProps<Theme> = {
  width: 80, height: 80, borderRadius: '20px', bgcolor: 'primary.main',
  display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, fontSize: 36,
};
export const aboutFooterBoxSx: SxProps<Theme> = { bgcolor: 'background.default', borderRadius: '12px', p: 2, mt: 2 };
export const emailButtonSx: SxProps<Theme> = {
  justifyContent: 'flex-start', p: 2, borderRadius: '12px',
  bgcolor: 'primary.main', color: 'white', textTransform: 'none', gap: 2,
  '&:hover': { bgcolor: 'primary.dark' }, textDecoration: 'none',
};
export const emailIconCircleSx: SxProps<Theme> = {
  width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
};
