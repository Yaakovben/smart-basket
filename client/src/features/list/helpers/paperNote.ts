// ===== "פתק נייר" - שפת עיצוב אחת להערה *ולתמונה* בכל האפליקציה =====
//
// גם הערה וגם תמונה נראות כמו בועת-פתק תכלת מעוגלת, שטוחה (בלי הטיה),
// עם פינה מקופלת (dog-ear) קטנה בפינה השמאלית-עליונה. אותו גוון, אותה
// פינה, אותו רדיוס - רק הגודל ורמת הפירוט משתנים לפי הקשר:
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
  // הפינה המקופלת (dog-ear) - גרדיאנט (לא צבע שטוח) כדי שהפינה תיראה
  // כמו נייר שמתקפל ומרים קצה, לא סתם פינה חתוכה באלכסון.
  flapLight: 'linear-gradient(135deg, rgba(94,234,212,0.9) 0%, rgba(13,148,136,0.35) 100%)',
  flapDark: 'linear-gradient(135deg, rgba(94,234,212,0.55) 0%, rgba(45,212,191,0.25) 100%)',
  // אייקון + תוויות
  inkLight: '#0F766E',
  inkDark: '#5EEAD4',
  // גוף הטקסט
  textLight: '#134E4A',
  textDark: '#B9F0E6',
  // מסגרת דקה סביב תמונת מוצר (שורה + מודאל) - תכלת, לא צבע הקטגוריה
  frameLight: 'rgba(20,184,166,0.45)',
  frameDark: 'rgba(45,212,191,0.5)',
} as const;

type PaperSize = 'chip' | 'field' | 'card';
const FOLD: Record<PaperSize, number> = { chip: 9, field: 16, card: 18 };
// מלבן מעוגל רגיל - חוץ מהפינה עם הקיפול, שנשארת כמעט חדה כדי שהמשולש
// ישב עליה נקי (כמו "פתק" אמיתי - לא ריבוע עם קרע גס באלכסון בכל הפינות,
// שזו הייתה הבעיה בגרסה הקודמת עם clip-path פנטגון).
const RADIUS: Record<PaperSize, string> = {
  chip: '4px 12px 12px 12px',
  field: '4px 16px 16px 16px',
  card: '4px 18px 18px 18px',
};

// הצ'יפ הסגור "הוסף הערה" / "הוסף תמונה" - זהה לחלוטין לשניהם (אותה
// צורה, אותו צבע, אותה פינה מקופלת). הקומפוננטה מוסיפה רק אייקון, טקסט
// ו-cursor/opacity לפי מצב (בלי עיגול "+" נפרד - האייקון עצמו כבר מסמן
// "הוספה", ה-+ היה כפול).
export const addChipSx = (isDark: boolean) => {
  const fold = FOLD.chip;
  return {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.6,
    py: 0.6, pl: 1.3, pr: 1.1,
    userSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    color: isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight,
    backgroundImage: isDark ? PAPER_NOTE.fillDark : PAPER_NOTE.fillLight,
    borderRadius: RADIUS.chip,
    overflow: 'hidden',
    boxShadow: '0 1.5px 4px rgba(20,184,166,0.18)',
    transition: 'all 0.18s',
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: fold + 1, height: fold + 1,
      background: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
      // צל קטן על קו הקיפול - בלעדיו זו סתם פינה חתוכה באלכסון, איתו
      // זה קורא כפינת נייר שמתקפלת ומטילה צל על הדף שמתחתיה.
      filter: `drop-shadow(0.5px 0.5px 0.5px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(15,118,110,0.35)'})`,
    },
    '&:hover': { transform: 'translateY(-1px)' },
    '&:active': { transform: 'scale(0.97)' },
  };
};

// סגנון הבסיס של הפתק (רקע, מסגרת, פינה מקופלת). מרכיבים ייחודיים
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
    borderRadius: RADIUS[size],
    // בלי overflow:hidden - 'field'/'card' מוסיפים סרט washi שיושב חלקית
    // *מעל* הקופסה (top שלילי, ראו ProductNoteField.tsx/ProductDetailsModal.tsx);
    // המשולש של הקיפול לא צריך את זה בכלל - הוא כבר תחום לגמרי בפינה
    // (0,0 בגודל fold) בלי קשר לרדיוס של שאר הקופסה.
    // המשולש של הפינה המקופלת (הדף "מורם" בפינה העליונה-שמאלית) - גרדיאנט
    // + צל קטן על קו הקיפול, כדי שזה יקרא כנייר שמתקפל ולא כפינה חתוכה.
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: fold + (size === 'chip' ? 1 : 2),
      height: fold + (size === 'chip' ? 1 : 2),
      background: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
      filter: `drop-shadow(1px 1px 1px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(15,118,110,0.3)'})`,
      zIndex: 1,
    },
  };
};
