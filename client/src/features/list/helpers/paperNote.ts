// ===== "פתק נייר" - שפת עיצוב אחת להערה *ולתמונה* בכל האפליקציה =====
//
// הערה ותמונה = אותו משטח "נייר" תכלת נקי: גרדיאנט תכלת עדין, מסגרת
// תכלת דקה, פינות מעוגלות אחידות וצל רך שנותן תחושת דף שמרים מהרקע
// ("תופס אור" בקצה העליון). *בלי* פינה מקופלת (dog-ear) - היא נראתה
// שבורה/זולה בגדלים הקטנים והסתירה תוכן. הרמז ל"נייר" עכשיו: קווי
// מחברת חיוורים מאוד ברקע (רק ב-'field'/'card') + ההדגשה הפנימית העליונה.
//
// צבע אחד (תכלת המותג), עיצוב אחד לכל ההקשרים:
//   'chip'  - חיווי זעיר בשורת הרשימה (SwipeItem) + צ'יפ "הוסף הערה/תמונה"
//   'field' - הפתק במצב פתוח בטופס הוסף/ערוך מוצר
//   'card'  - הפתק המלא במסך פרטי המוצר

export const PAPER_NOTE = {
  fillLight: 'linear-gradient(310deg, #C7F5EA 0%, #E6F9F5 100%)',
  fillDark: 'linear-gradient(180deg, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.10) 100%)',
  edgeLight: 'rgba(20,184,166,0.28)',
  edgeDark: 'rgba(45,212,191,0.34)',
  // אייקון + תוויות
  inkLight: '#0F766E',
  inkDark: '#5EEAD4',
  // גוף הטקסט שנכתב בהערה - הובהר שוב (עדיין נקרא כהה מדי מול הרקע התכלת).
  textLight: '#2AAE99',
  textDark: '#C6F3EA',
  // מסגרת דקה סביב תמונת מוצר (שורה + מודאל) - תכלת, לא צבע הקטגוריה
  frameLight: 'rgba(20,184,166,0.45)',
  frameDark: 'rgba(45,212,191,0.5)',
  // רקע ה"פייד" של חיווי הגלילה בתחתית הפתק - חייב להתמזג עם ה-fill.
  fadeLight: 'rgba(219,247,240,0.96)',
  fadeDark: 'rgba(17,38,36,0.94)',
} as const;

type PaperSize = 'chip' | 'field' | 'card';

// פינות מעוגלות אחידות (כל הפינות שוות - אין יותר פינה "חדה" בצד הקיפול).
const RADIUS: Record<PaperSize, number> = { chip: 8, field: 12, card: 16 };

// צל אחיד ורך ל"נייר" - הדגשה פנימית בקצה העליון + הרמה עדינה מעל הרקע.
const paperShadow = (isDark: boolean, size: PaperSize): string => {
  if (isDark) {
    return size === 'card'
      ? '0 12px 28px rgba(0,0,0,0.42), 0 3px 8px rgba(0,0,0,0.28)'
      : size === 'field'
        ? '0 6px 16px rgba(0,0,0,0.35)'
        : '0 1.5px 5px rgba(0,0,0,0.3)';
  }
  const lift =
    size === 'card'
      ? '0 14px 32px rgba(20,184,166,0.16), 0 2px 6px rgba(15,118,110,0.08)'
      : size === 'field'
        ? '0 6px 16px rgba(20,184,166,0.10), 0 1px 2px rgba(15,118,110,0.06)'
        : '0 1.5px 4px rgba(20,184,166,0.18)';
  return `inset 0 1px 0 rgba(255,255,255,0.85), ${lift}`;
};

// קווי מחברת חיוורים מאוד ברקע - הרמז ל"נייר" (רק ב-'field'/'card').
const RULED_LINES =
  'repeating-linear-gradient(transparent 0 22px, rgba(20,184,166,0.06) 22px 23px)';

// הצ'יפ הסגור "הוסף הערה" / "הוסף תמונה" - זהה לחלוטין לשניהם. משטח נייר
// נקי, פינות מעוגלות אחידות, בלי קיפול. הקומפוננטה מוסיפה רק אייקון+טקסט.
export const addChipSx = (isDark: boolean) => ({
  position: 'relative' as const,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.6,
  py: 0.7, px: 1.3,
  userSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
  color: isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight,
  backgroundImage: isDark ? PAPER_NOTE.fillDark : PAPER_NOTE.fillLight,
  border: '1px solid',
  borderColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
  borderRadius: `${RADIUS.chip}px`,
  boxShadow: paperShadow(isDark, 'chip'),
  transition: 'transform 0.14s ease, box-shadow 0.18s ease',
  // hover רק במכשירים עם עכבר אמיתי - במגע ה-:hover "נדבק" אחרי הקשה
  // (למשל כשנפתח בורר הקבצים) והצ'יפ נשאר מוזז 1px עד הקשה אחרת = "קופץ".
  '@media (hover: hover)': {
    '&:hover': { transform: 'translateY(-1px)' },
  },
  '&:active': { transform: 'scale(0.97)' },
});

// סגנון הבסיס של הפתק (רקע, מסגרת, קווי מחברת). מרכיבים ייחודיים להקשר -
// תווית, מונה תווים, חיווי גלילה - נשארים בקומפוננטה. מחזיר אובייקט
// קונקרטי (לא SxProps) כדי שאפשר יהיה לפרוס אותו (...) לתוך sx.
export const paperNoteSx = (size: PaperSize, isDark: boolean) => {
  const base = {
    position: 'relative' as const,
    backgroundImage: isDark ? PAPER_NOTE.fillDark : PAPER_NOTE.fillLight,
    border: '1px solid',
    borderColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
    borderRadius: `${RADIUS[size]}px`,
    boxShadow: paperShadow(isDark, size),
  };

  // 'chip' / 'card' - clip נקי לפינות. 'field' *לא* - כפתור הסגירה של
  // ההערה מבצבץ מעט מחוץ לפינה (ראו ProductNoteField).
  if (size === 'chip') return { ...base, overflow: 'hidden' as const };

  // 'field' / 'card' - קווי מחברת חיוורים ברקע. borderRadius:'inherit' על
  // ה-::after כדי שהקווים ייחתכו לפינות גם ב-'field' (בלי overflow:hidden).
  return {
    ...base,
    ...(size === 'card' ? { overflow: 'hidden' as const } : {}),
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      backgroundImage: RULED_LINES,
      pointerEvents: 'none',
      zIndex: 0,
    },
  };
};
