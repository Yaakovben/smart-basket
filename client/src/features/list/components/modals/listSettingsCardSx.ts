// ===== סגנון משותף ל"שורות פעולה" בהגדרות רשימה =====
// (שינוי סיסמה / הפוך למשותפת / הפוך לפרטית ב-EditListModal).
//
// גרסה שנייה - הגרסה הקודמת (כרטיס שלם צבוע בגוון פסטלי חלש) התבררה
// כלא ברורה מספיק: הצבע החלש-מדי גרם לזה להיראות כמו עוד שורת מידע
// אפורה, לא כמו פעולה זמינה - "איפה זה?" היה התגובה. הפתרון: תבנית
// "שורת הגדרות" סטנדרטית (כמו iOS/Material Settings) - השורה עצמה
// נייטרלית ונקייה (action.hover), וכל הצבע מרוכז בתג-אייקון עגול מלא
// (לא שקוף) - זה מה שבפועל אומר "זו פעולה, ובצבע הזה" בלי לצבוע את כל
// הרקע. שני טונים בלבד: accent (תכלת המותג, לפעולות "מרחיבות" - שינוי
// סיסמה/הפוך למשותפת) ו-neutral (אפור, לפעולת "צמצום" - חזרה לפרטי).
import type { SxProps, Theme } from '@mui/material';

export type CardTone = 'accent' | 'neutral';

const BADGE_FILL: Record<CardTone, { light: string; dark: string }> = {
  accent: { light: '#14B8A6', dark: '#2DD4BF' },
  neutral: { light: '#94A3B8', dark: '#64748B' },
};

// שורה נייטרלית, זהה בדיוק לצ'יפ/פריט הגדרות רגיל באפליקציה - שום
// גרדיאנט/גוון-רקע ייחודי, כדי שהצבע היחיד שיבלוט הוא תג האייקון.
export const settingsRowSx = (disabled = false): SxProps<Theme> => ({
  p: 1.5,
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  bgcolor: 'action.hover',
  border: '1px solid',
  borderColor: 'divider',
  transition: 'background-color 0.15s ease, transform 0.1s ease',
  WebkitTapHighlightColor: 'transparent',
  '&:active': disabled ? {} : { transform: 'scale(0.985)' },
});

// תג אייקון עגול, מילוי מלא (לא שקוף) - זה מה שבפועל "צובע" את הפעולה.
export const iconBadgeSx = (tone: CardTone, isDark: boolean): SxProps<Theme> => ({
  width: 38,
  height: 38,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  bgcolor: isDark ? BADGE_FILL[tone].dark : BADGE_FILL[tone].light,
  boxShadow: `0 3px 8px ${tone === 'accent' ? 'rgba(20,184,166,0.4)' : 'rgba(100,116,139,0.3)'}`,
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
