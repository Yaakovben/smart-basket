import type { SxProps, Theme } from '@mui/material';

// שפת הצבע של Pro בכל האפליקציה: סגול-אינדיגו עמוק ואלגנטי (violet-600 עד
// indigo-700) למשטחים מלאים, ורקע סגול רך עם טקסט כהה לתגיות ולמידע משני.
// כל תגית, כרטיס, באנר וכפתור של Pro משתמשים באלה, כדי שהכל ייראה אותו דבר.
export const PRO_PURPLE = '#7C3AED';       // violet-600
export const PRO_PURPLE_DARK = '#4338CA';  // indigo-700
export const PRO_TEXT = '#6D28D9';         // violet-700: טקסט על רקע רך
export const PRO_SOFT = '#F5F3FF';         // violet-50: רקע לתגיות
export const PRO_SOFT_BORDER = '#DDD6FE';  // violet-200: מסגרת לתגיות
export const PRO_LILAC = '#C4B5FD';        // violet-300: טקסט על רקע כהה
export const PRO_GRADIENT = 'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)';
// זהב רק כנגיעה אחת בכרטיס המנוי (הכוכב וטבעת הספירה לאחור)
export const PRO_GOLD = '#FCD34D';
export const PRO_GOLD_GRADIENT = 'linear-gradient(135deg, #FDE68A, #F59E0B)';

// תגית Pro רכה: רקע סגול בהיר, טקסט כהה ומסגרת עדינה. בכהה: שקוף עם טקסט בהיר.
export const proSoftPillSx = (isDark: boolean) => ({
  bgcolor: isDark ? 'rgba(124,58,237,0.18)' : PRO_SOFT,
  color: isDark ? PRO_LILAC : PRO_TEXT,
  border: '1px solid', borderColor: isDark ? 'rgba(167,139,250,0.28)' : PRO_SOFT_BORDER,
});

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

// כפתור שקט ובטוח: צבע אחיד, בלי הברקה חוזרת-לנצח - זה נראה "נדחף" יותר
// משהוא עוזר. תשומת לב מגיעה מהצבע והמשקל, לא מתנועה מתמשכת.
// background ולא bgcolor: ה-theme מגדיר לכפתור contained גרדיאנט טורקיז
// ב-background, שגובר על background-color ולכן הכפתור יצא טורקיז ולא סגול.
// הגרדיאנט המעודן עם צל רך, ובמעבר ובלחיצה שינוי עדין וחלק (בהירות, צל, הקטנה
// קלה) במקום החלפת צבע חדה.
export const primaryCtaSx: SxProps<Theme> = {
  borderRadius: '14px', fontWeight: 800, fontSize: 15.5, py: 1.35,
  textTransform: 'none',
  background: PRO_GRADIENT,
  boxShadow: '0 4px 14px rgba(67,56,202,0.22)',
  color: '#fff',
  transition: 'filter 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
  '&:hover': { background: PRO_GRADIENT, filter: 'brightness(1.07)', boxShadow: '0 6px 18px rgba(67,56,202,0.3)' },
  '&:active': { transform: 'scale(0.985)', filter: 'brightness(0.97)', boxShadow: '0 2px 8px rgba(67,56,202,0.2)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.75)', opacity: 0.6, boxShadow: 'none' },
};

export const ghostCtaSx: SxProps<Theme> = {
  borderRadius: '12px', textTransform: 'none', fontWeight: 600, fontSize: 13.5,
  color: 'text.secondary',
};

// כניסה מדורגת של כרטיסים: עלייה קלה + fade. delay מדורג לפי סדר הכרטיס.
export const revealSx = (index: number): SxProps<Theme> => ({
  animation: `sbReveal 0.5s ${Math.min(index, 8) * 70}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  '@keyframes sbReveal': {
    from: { opacity: 0, transform: 'translateY(14px) scale(0.985)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});
