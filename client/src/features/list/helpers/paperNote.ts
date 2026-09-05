// ===== "פתק נייר" - שפת עיצוב אחת להערה *ולתמונה* בכל האפליקציה =====
//
// גם הערה וגם תמונה נראות כמו פיסת נייר תכלת עם פינה מקופלת (dog-ear).
// אותו גוון, אותה פינה, אותה הטיה כמעט-שטוחה - רק הגודל ורמת הפירוט
// משתנים לפי הקשר:
//   'chip'  - חיווי זעיר בשורת הרשימה (SwipeItem)
//   'field' - הפתק במצב פתוח בטופס הוסף/ערוך מוצר (הערה ותמונה)
//   'card'  - הפתק המלא במסך פרטי המוצר
//
// צבע אחד (תכלת המותג), עיצוב אחד - אין "זהות צבע" נפרדת לתמונה.

export const PAPER_NOTE = {
  fillLight: 'linear-gradient(180deg, #F0FDFA 0%, #E6F9F5 100%)',
  fillDark: 'linear-gradient(180deg, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.10) 100%)',
  edgeLight: 'rgba(20,184,166,0.22)',
  edgeDark: 'rgba(45,212,191,0.32)',
  flapLight: 'rgba(13,148,136,0.20)',
  flapDark: 'rgba(45,212,191,0.30)',
  // אייקון + תוויות
  inkLight: '#0F766E',
  inkDark: '#5EEAD4',
  // גוף הטקסט
  textLight: '#134E4A',
  textDark: '#B9F0E6',
  // הצ'יפ הסגור ("הוסף הערה" / "הוסף תמונה") - מלא, לא גרדיאנט
  chipBgLight: '#E0F7F4',
  chipBgDark: 'rgba(20,184,166,0.22)',
  // מסגרת דקה סביב תמונת מוצר (שורה + מודאל) - תכלת, לא צבע הקטגוריה
  frameLight: 'rgba(20,184,166,0.45)',
  frameDark: 'rgba(45,212,191,0.5)',
  tilt: 'rotate(-0.15deg)',
} as const;

type PaperSize = 'chip' | 'field' | 'card';
const FOLD: Record<PaperSize, number> = { chip: 6, field: 16, card: 18 };

// הצ'יפ הסגור "הוסף הערה" / "הוסף תמונה" - זהה לחלוטין לשניהם (אותה
// צורה, אותו צבע, אותה פינה מקופלת). הקומפוננטה מוסיפה רק אייקון, טקסט,
// עיגול "+", ו-cursor/opacity לפי מצב.
export const addChipSx = (isDark: boolean) => ({
  position: 'relative' as const,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.6,
  py: 0.55, pl: 1.1, pr: 1.4,
  userSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
  color: isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight,
  bgcolor: isDark ? PAPER_NOTE.chipBgDark : PAPER_NOTE.chipBgLight,
  transform: 'rotate(-1.2deg)',
  boxShadow: '0 1.5px 4px rgba(20,184,166,0.18)',
  transition: 'all 0.18s',
  clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 0 100%, 0 7px)',
  '&::before': {
    content: '""',
    position: 'absolute', top: 0, left: 0,
    width: 8, height: 8,
    bgcolor: isDark ? PAPER_NOTE.flapDark : 'rgba(13,148,136,0.25)',
    clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
  },
  '&:hover': { transform: 'rotate(-0.6deg) translateY(-1px)' },
});

// סגנון הבסיס של הפתק (רקע, מסגרת, פינה מקופלת, הטיה). מרכיבים ייחודיים
// להקשר - סרט washi, קווי מחברת, תווית - נשארים בקומפוננטה עצמה.
// מחזיר אובייקט קונקרטי (לא SxProps) כדי שאפשר יהיה לפרוס אותו (...) לתוך
// sx יחד עם מאפיינים נוספים.
export const paperNoteSx = (size: PaperSize, isDark: boolean) => {
  const fold = FOLD[size];
  return {
    position: 'relative',
    backgroundImage: isDark ? PAPER_NOTE.fillDark : PAPER_NOTE.fillLight,
    border: '1px solid',
    borderColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
    transform: PAPER_NOTE.tilt,
    clipPath: `polygon(${fold}px 0, 100% 0, 100% 100%, 0 100%, 0 ${fold}px)`,
    // המשולש של הפינה המקופלת (הדף "מורם" בפינה העליונה-שמאלית)
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: fold + (size === 'chip' ? 1 : 2),
      height: fold + (size === 'chip' ? 1 : 2),
      bgcolor: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
      zIndex: 1,
    },
  };
};
