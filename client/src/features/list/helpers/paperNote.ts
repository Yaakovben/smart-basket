// ===== "פתק נייר" - שפת עיצוב אחת להערה *ולתמונה* בכל האפליקציה =====
//
// גם הערה וגם תמונה נראות כמו בועת-פתק תכלת מעוגלת, שטוחה (בלי הטיה),
// עם פינה מקופלת (dog-ear) קטנה בפינה השמאלית-עליונה. אותו גוון, אותה
// פינה - רק הגודל ורמת הפירוט משתנים לפי הקשר:
//   'chip'  - חיווי זעיר בשורת הרשימה (SwipeItem)
//   'field' - הפתק במצב פתוח בטופס הוסף/ערוך מוצר (הערה ותמונה)
//   'card'  - הפתק המלא במסך פרטי המוצר
//
// צבע אחד (תכלת המותג), עיצוב אחד - אין "זהות צבע" נפרדת לתמונה.
//
// הפינה המקופלת (גודל/צורה/גרדיאנט/צל) כוילה ידנית מול רפרנס אמיתי דרך
// כלי אינטראקטיבי חי (לא ניחוש) - ראו CLIP_PATH/FOLD_SHADOW למטה.

export const PAPER_NOTE = {
  fillLight: 'linear-gradient(310deg, #C7F5EA 0%, #E6F9F5 100%)',
  fillDark: 'linear-gradient(180deg, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.10) 100%)',
  edgeLight: 'rgba(20,184,166,0.22)',
  edgeDark: 'rgba(45,212,191,0.32)',
  // הפינה המקופלת - גרדיאנט תלת-גוני עם פס "ברק" (shine) לבן באמצע: זה
  // מה שנותן תחושת גליל/דף מגולגל אמיתית במקום גרדיאנט דו-גוני שטוח.
  flapLight: 'linear-gradient(135deg, #F5FAF9 0%, #FFFFFF 55%, #0F766E 100%)',
  flapDark: 'linear-gradient(135deg, #2DD4BF 0%, #FFFFFF 55%, #0D9488 100%)',
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
// גודל תיבת הקיפול. 'field' אין לו כלי כיול נפרד - מוערך יחסית בין chip
// ל-card לפי אותו יחס גודל (~0.82 מ-card, כמו שהיה בכיולים קודמים).
const FOLD: Record<PaperSize, number> = { chip: 20, field: 31, card: 38 };
const RADIUS: Record<PaperSize, string> = {
  chip: '3px 5px 5px 5px',
  field: '3px 8px 8px 8px',
  card: '3px 10px 10px 10px',
};
// צורת הקיפול - clip-path עם קשת SVG (לא border-radius) כדי לקבל בדיוק
// את העקומה שכוילה (curve~75%, קרוב לעיגול). 'field' מחושב באותה נוסחה
// על הגודל המוערך שלו.
const CLIP_PATH: Record<PaperSize, string> = {
  chip: 'path("M0,0 L20,0 A15,15 0 0,1 0,20 Z")',
  field: 'path("M0,0 L31,0 A23,23 0 0,1 0,31 Z")',
  card: 'path("M0,0 L38,0 A29,29 0 0,1 0,38 Z")',
};
// צל כפול (קו הקיפול + הרמה קלה מעל הדף) - כוילו יחד עם הגודל/צורה.
const FOLD_SHADOW: Record<PaperSize, string> = {
  chip: 'inset -4px -4px 5px rgba(0,0,0,0.22), 1px 1px 2px rgba(0,0,0,0.18)',
  field: 'inset -6px -6px 8px rgba(0,0,0,0.22), 2px 2px 3px rgba(0,0,0,0.18)',
  card: 'inset -7px -7px 10px rgba(0,0,0,0.22), 2px 2px 3px rgba(0,0,0,0.18)',
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
    transition: 'transform 0.14s ease, box-shadow 0.18s ease',
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: fold, height: fold,
      background: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: CLIP_PATH.chip,
      boxShadow: FOLD_SHADOW.chip,
    },
    // hover רק במכשירים עם עכבר אמיתי - במגע ה-:hover "נדבק" אחרי הקשה
    // (למשל כשנפתח בורר הקבצים) והצ'יפ נשאר מוזז 1px עד הקשה אחרת = "קופץ".
    '@media (hover: hover)': {
      '&:hover': { transform: 'translateY(-1px)' },
    },
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
    // overflow:hidden רק ב-'chip' (אין שם סרט washi) - ב-'field'/'card'
    // *אסור* overflow:hidden - הסרט יושב חלקית *מעל* הקופסה (top שלילי,
    // ראו ProductNoteField.tsx/ProductDetailsModal.tsx) והוא היה נחתך.
    ...(size === 'chip' ? { overflow: 'hidden' as const } : {}),
    '&::before': {
      content: '""',
      position: 'absolute', top: 0, left: 0,
      width: fold, height: fold,
      background: isDark ? PAPER_NOTE.flapDark : PAPER_NOTE.flapLight,
      clipPath: CLIP_PATH[size],
      boxShadow: FOLD_SHADOW[size],
      zIndex: 1,
    },
  };
};
