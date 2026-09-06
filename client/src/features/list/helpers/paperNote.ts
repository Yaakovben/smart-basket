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
  // הפינה המקופלת (dog-ear) - צבע שטוח אחיד, לא גרדיאנט ולא drop-shadow.
  // שתי הגרסאות הקודמות (rgba שקוף, ואז גרדיאנט+צל) יצאו מרוחות/מלוכלכות
  // ("מעפן") - צבע אחיד נקי הוא הכי קרוב למקור (פינת נייר מוצקה, ברורה).
  flapLight: '#0D9488',
  flapDark: '#2DD4BF',
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
// 'chip' תואם לרפרנס. 50 על 'card' התברר להיות בערך כפול ממה שנחוץ בפועל
// (המשולש כיסה מעל חצי מגובה הכרטיס בצילום אמיתי) - הגובה בפועל של
// הכרטיס/השדה הפתוח קטן משמעותית ממה שהוערך. תוקן לפי הצילום בפועל,
// לא לפי הערכה תיאורטית של הגובה.
const FOLD: Record<PaperSize, number> = { chip: 11, field: 28, card: 34 };
// רדיוס מתון - לא כמעט-פילה/עיגול מלא (זה נראה גרוע, פחות "פתק" ויותר
// כפתור). חוץ מהפינה עם הקיפול, שנשארת כמעט חדה כדי שהמשולש ישב עליה נקי.
const RADIUS: Record<PaperSize, string> = {
  chip: '3px 8px 8px 8px',
  field: '3px 10px 10px 10px',
  card: '3px 12px 12px 12px',
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
    py: 0.7, pl: 1.7, pr: 1.1,
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
      bgcolor: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
      // צל פנימי לאורך קו האלכסון - box-shadow:inset מכובד ע"י clip-path,
      // נותן טיפת עומק לקיפול בלי לחזור לגרדיאנט/mask שנכשלו קודם.
      boxShadow: 'inset -3px -3px 4px rgba(0,0,0,0.18)',
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
    // overflow:hidden רק ב-'chip' (אין שם סרט washi) - בלעדיו הפינה
    // המרובעת-חדה של משולש הקיפול בולטת מעבר לעיגול הפינה של הקופסה
    // עצמה ונראית כמו פיסה נפרדת שצפה ליד הצ'יפ, לא חלק ממנו. ב-'field'/
    // 'card' *אסור* overflow:hidden - הסרט יושב חלקית *מעל* הקופסה (top
    // שלילי, ראו ProductNoteField.tsx/ProductDetailsModal.tsx) והוא היה נחתך.
    ...(size === 'chip' ? { overflow: 'hidden' as const } : {}),
    // המשולש של הפינה המקופלת (הדף "מורם" בפינה העליונה-שמאלית) - צבע
    // שטוח אחיד + צל פנימי קטן לאורך קו האלכסון לטיפת עומק (לא גרדיאנט/
    // mask - אלה יצאו מרוחים/שבורים בגרסאות קודמות).
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: fold + (size === 'chip' ? 1 : 2),
      height: fold + (size === 'chip' ? 1 : 2),
      bgcolor: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
      boxShadow: `inset -${Math.round(fold * 0.18)}px -${Math.round(fold * 0.18)}px ${Math.round(fold * 0.25)}px rgba(0,0,0,0.18)`,
      zIndex: 1,
    },
  };
};
