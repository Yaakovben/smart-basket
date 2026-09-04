// ===== "פתק נייר" - שפת עיצוב אחת להערות בכל האפליקציה =====
//
// הערה תמיד נראית כמו פיסת נייר תכלת קטנה עם פינה מקופלת (dog-ear)
// בקצה העליון. אותו גוון נייר, אותה פינה, אותו אייקון (EditNoteRounded)
// ואותה הטיה כמעט-שטוחה - רק הגודל ורמת הפירוט משתנים לפי הקשר:
//   'chip'  - חיווי זעיר בשורת הרשימה (SwipeItem), מציג את תוכן ההערה
//   'field' - הפתק במצב פתוח בטופס הוסף/ערוך מוצר (ProductNoteField)
//   'card'  - הפתק המלא במסך פרטי המוצר (ProductDetailsModal)
//
// לפני האיחוד: השורה הציגה שבב תכלת שטוח בלי פינה, והמסך/הטופס נייר
// מקופל - שתי שפות שונות לאותו דבר.

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
  tilt: 'rotate(-0.15deg)',
} as const;

type PaperSize = 'chip' | 'field' | 'card';
const FOLD: Record<PaperSize, number> = { chip: 6, field: 16, card: 18 };

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
