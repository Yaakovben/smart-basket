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
  // "קיפול" הפינה (dog-ear) - גרדיאנט אלכסוני מבהיר (קצה הקיפול, קולט
  // אור) לכהה (קו הקיפול/הצל שמתחתיו), ממוסך ברדיאלי (ראו curlMask
  // למטה) כדי לקבל קשת מעוגלת - לא משולש שטוח באלכסון ישר.
  curlLight: 'linear-gradient(to bottom right, #FFFFFF 0%, #E6F6F2 24%, #86CEC1 58%, #5FB4A6 82%, #0D9488 100%)',
  curlDark: 'linear-gradient(to bottom right, rgba(190,247,239,0.95) 0%, rgba(94,234,212,0.75) 30%, rgba(20,184,166,0.5) 65%, rgba(4,47,43,0.9) 100%)',
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
// גודל תיבת הקיפול (לא "רוחב הפינה החתוכה" כמו קודם) - הקשת הנראית
// בפועל היא רק פלח קטן ממנה, ראו curlMask.
const CURL: Record<PaperSize, number> = { chip: 22, field: 30, card: 36 };
// רדיוס מתון - לא כמעט-פילה/עיגול מלא (זה נראה גרוע, פחות "פתק" ויותר
// כפתור). הפינה עם הקיפול נשארת כמעט חדה כדי שה-mask למטה לא ייחתך
// ע"י העיגול של הקופסה עצמה (overflow:hidden ב-'chip').
const RADIUS: Record<PaperSize, string> = {
  chip: '3px 8px 8px 8px',
  field: '3px 10px 10px 10px',
  card: '3px 12px 12px 12px',
};

// ממיר גרדיאנט מרובע לקשת מעוגלת (page-curl אמיתי, לא משולש עם אלכסון
// ישר): עיגול שמרכזו בפינה הנגדית לקיפול (100% 100% - "הציר" שהדף
// מקופל עליו), ברדיוס כמעט כגודל התיבה - כך שהחלק הגלוי הוא רק קשת דקה
// בפינה הנגדית (0,0), בדיוק שם שיושבת הפינה המקופלת.
const curlMask = (size: number) => {
  const r = Math.round(size * 0.925);
  return `radial-gradient(circle ${r}px at 100% 100%, transparent ${r - 1}px, #000 ${r}px)`;
};

// הצ'יפ הסגור "הוסף הערה" / "הוסף תמונה" - זהה לחלוטין לשניהם (אותה
// צורה, אותו צבע, אותה פינה מקופלת). הקומפוננטה מוסיפה רק אייקון, טקסט
// ו-cursor/opacity לפי מצב (בלי עיגול "+" נפרד - האייקון עצמו כבר מסמן
// "הוספה", ה-+ היה כפול).
export const addChipSx = (isDark: boolean) => {
  const curl = CURL.chip;
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
      width: curl, height: curl,
      pointerEvents: 'none' as const,
      background: isDark ? PAPER_NOTE.curlDark : PAPER_NOTE.curlLight,
      WebkitMaskImage: curlMask(curl),
      maskImage: curlMask(curl),
      filter: `drop-shadow(1px 1px 1.5px ${isDark ? 'rgba(0,0,0,0.45)' : 'rgba(15,118,110,0.35)'})`,
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
  const curl = CURL[size];
  return {
    position: 'relative',
    backgroundImage: isDark ? PAPER_NOTE.fillDark : PAPER_NOTE.fillLight,
    border: '1px solid',
    borderColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
    borderRadius: RADIUS[size],
    // overflow:hidden רק ב-'chip' (אין שם סרט washi) - בלעדיו הפינה
    // כמעט-חדה של הקופסה (RADIUS[size]) הייתה נראית כפיסה נפרדת ליד
    // הקיפול. ב-'field'/'card' *אסור* overflow:hidden - הסרט יושב חלקית
    // *מעל* הקופסה (top שלילי, ראו ProductNoteField.tsx/ProductDetailsModal.tsx)
    // והוא היה נחתך.
    ...(size === 'chip' ? { overflow: 'hidden' as const } : {}),
    // page-curl אמיתי בפינה השמאלית-עליונה - גרדיאנט אלכסוני (בהיר בקצה
    // הקיפול -> כהה בקו הקיפול) ממוסך לקשת מעוגלת (curlMask), עם
    // drop-shadow שעוקב אחרי צורת הקשת בפועל (לא מלבן) - נותן עומק
    // תלת-ממדי אמיתי, לא משולש שטוח.
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: curl, height: curl,
      pointerEvents: 'none' as const,
      background: isDark ? PAPER_NOTE.curlDark : PAPER_NOTE.curlLight,
      WebkitMaskImage: curlMask(curl),
      maskImage: curlMask(curl),
      filter: `drop-shadow(1.5px 1.5px 2px ${isDark ? 'rgba(0,0,0,0.45)' : 'rgba(15,118,110,0.3)'})`,
      zIndex: 1,
    },
  };
};
