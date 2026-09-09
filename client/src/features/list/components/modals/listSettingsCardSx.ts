// ===== סגנון משותף ל"כרטיסי פעולה" בהגדרות רשימה =====
// (שינוי סיסמה / הפוך למשותפת / הפוך לפרטית ב-EditListModal) - היה קודם
// שלוש קומפוננטות עם אמוג'י גולמי (🔑/👥/📝) בריבוע צבע שטוח, וצבע מקרי
// (indigo) ל"הפוך לפרטית" שלא קשור לשום מקום אחר בפלטת האפליקציה. במקום
// זה: אייקון וקטורי אמיתי בתוך "תג" עגול עם גרדיאנט רך, ושתי גוונים בלבד -
// תכלת המותג לפעולה "מרחיבה" (הוספת שיתוף/סיסמה), ונייטרלי רגוע לפעולה
// "מצמצמת" (חזרה לפרטי) - בלי לייבא צבע-מותג שני שלא קיים בשום מקום אחר.
import type { SxProps, Theme } from '@mui/material';

export type CardTone = 'accent' | 'neutral';

const GRADIENTS: Record<CardTone, { light: string; dark: string }> = {
  accent: {
    light: 'linear-gradient(135deg, rgba(20,184,166,0.10) 0%, rgba(13,148,136,0.04) 100%)',
    dark: 'linear-gradient(135deg, rgba(20,184,166,0.16) 0%, rgba(13,148,136,0.06) 100%)',
  },
  neutral: {
    light: 'linear-gradient(135deg, rgba(100,116,139,0.08) 0%, rgba(100,116,139,0.03) 100%)',
    dark: 'linear-gradient(135deg, rgba(148,163,184,0.14) 0%, rgba(148,163,184,0.05) 100%)',
  },
};

const BORDER: Record<CardTone, { light: string; dark: string }> = {
  accent: { light: 'rgba(20,184,166,0.28)', dark: 'rgba(45,212,191,0.32)' },
  neutral: { light: 'rgba(100,116,139,0.22)', dark: 'rgba(148,163,184,0.26)' },
};

const INK: Record<CardTone, { light: string; dark: string }> = {
  accent: { light: '#0F766E', dark: '#5EEAD4' },
  neutral: { light: '#475569', dark: '#CBD5E1' },
};

const BADGE_GRADIENT: Record<CardTone, { light: string; dark: string }> = {
  accent: { light: 'linear-gradient(135deg, #14B8A6, #0D9488)', dark: 'linear-gradient(135deg, #2DD4BF, #14B8A6)' },
  neutral: { light: 'linear-gradient(135deg, #94A3B8, #64748B)', dark: 'linear-gradient(135deg, #64748B, #475569)' },
};

export const cardInk = (tone: CardTone, isDark: boolean) => (isDark ? INK[tone].dark : INK[tone].light);

// כרטיס פעולה לחיצי (מתרחב/ממיר) - "פתק" רך בגוון הטון, לא ריבוע דהוי.
export const settingsCardSx = (tone: CardTone, isDark: boolean, disabled = false): SxProps<Theme> => ({
  mt: 2,
  p: 1.5,
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  backgroundImage: isDark ? GRADIENTS[tone].dark : GRADIENTS[tone].light,
  border: '1.5px solid',
  borderColor: isDark ? BORDER[tone].dark : BORDER[tone].light,
  boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.25)' : `0 2px 10px ${isDark ? '' : 'rgba(15,23,42,0.05)'}`,
  transition: 'transform 0.14s ease, box-shadow 0.18s ease, background-color 0.15s',
  WebkitTapHighlightColor: 'transparent',
  '&:active': disabled ? {} : { transform: 'scale(0.98)' },
});

// תג אייקון עגול, גרדיאנט רך + זוהר עדין - מחליף את ריבוע-הצבע+אמוג'י.
export const iconBadgeSx = (tone: CardTone, isDark: boolean): SxProps<Theme> => ({
  width: 38,
  height: 38,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  backgroundImage: isDark ? BADGE_GRADIENT[tone].dark : BADGE_GRADIENT[tone].light,
  boxShadow: `0 3px 10px ${tone === 'accent' ? 'rgba(20,184,166,0.35)' : 'rgba(100,116,139,0.3)'}`,
});

// שדה קוד 4-ספרות (סיסמת רשימה) - "חריצי ספרה" ויזואליים במקום שדה טקסט
// גנרי: גרדיאנט מפוספס עדין ברקע (4 תאים) + letterSpacing מכוון + מסגרת/
// זוהר-פוקוס בגוון המותג. עדיין input בודד אחד (לא 4 שדות נפרדים) -
// פשוט, נגיש, בלי ניהול focus מסובך בין תאים.
export const pinFieldSx = (isDark: boolean): SxProps<Theme> => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent calc(25% - 1px), ${
      isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
    } calc(25% - 1px), ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'} 25%)`,
    '& fieldset': { borderColor: isDark ? 'rgba(45,212,191,0.3)' : 'rgba(20,184,166,0.3)' },
    '&:hover fieldset': { borderColor: isDark ? 'rgba(45,212,191,0.5)' : 'rgba(20,184,166,0.5)' },
    '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '1.5px' },
  },
  '& input': { caretColor: isDark ? '#5EEAD4' : '#0F766E' },
});
