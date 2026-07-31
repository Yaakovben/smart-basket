import { detectCategory } from './categoryDetector';
import type { ProductCategory } from '../types';

export interface OcrListItem {
  name: string;
  category: ProductCategory;
}

export interface ParsedOcrList {
  items: OcrListItem[];
  // שורה שזוהתה ככותרת/שם הרשימה (לא כפריט קנייה) - null אם לא נמצאה כזו.
  // מוצג למשתמש כהסבר מדוע שורה מסוימת "נעלמה", לא נשמר/נשלח לשום מקום אוטומטית.
  detectedTitle: string | null;
}

// תווי בולט/מספור/סימון-וי נפוצים שאנשים מוסיפים ליד כל שורה בפתק -
// מסירים לפני השמירה כדי שלא ייכנסו כחלק משם המוצר.
const LEADING_MARKERS = /^[\s]*(?:[•*\-–—▪●○□☐✓✔·]|\d{1,2}[.)])[\s]*/;

// שורה שהיא רק תאריך/מספרים/פיסוק (למשל "27.07.2026" שמישהו רשם בראש הפתק) - רעש, לא מוצר
const DATE_OR_NUMBER_LINE = /^[\d./\-\s]+$/;

// מילות מפתח שמעידות ששורה היא כותרת/שם הרשימה ולא פריט קנייה בפני עצמו
// (למשל "רשימת קניות לשבת" בראש הפתק). נבדק רק על שורות שממילא לא זוהו
// כקטגוריית מוצר קיימת - כדי לא לפסול בטעות מוצר אמיתי שמכיל את המילה
// "קניות" בשמו (נדיר, אבל אפשרי).
const TITLE_HINT_WORDS = /רשימ|קניות|לקנות|פתק|shopping\s*list/i;

const MIN_NAME_LENGTH = 2;

// מחרוזות כשל ידועות שמנוע OCR.space מחזיר כשאין לו מה לקרוא
const OCR_FAILURE_STRINGS = new Set(['NO PRODUCT', 'NO TEXT', 'NO TEXT FOUND']);
// הודעות סטטוס של OCR.space בסוגריים מרובעים: [No text detected], [ERROR], וכו'
const OCR_STATUS_MESSAGE = /^\[.{1,60}\]$/;
// שורה ארוכה מזה כנראה רעש (OCR שחיבר בטעות כמה שורות פתק לאחת) ולא שם מוצר יחיד
const MAX_NAME_LENGTH = 60;

function looksLikeTitle(line: string, category: ProductCategory): boolean {
  return category === 'אחר' && TITLE_HINT_WORDS.test(line);
}

/**
 * הופך טקסט OCR גולמי (שורה לכל פריט בפתק, בדרך כלל) לרשימת מועמדים
 * להוספה - עם קטגוריה מזוהה אוטומטית לכל אחד (detectCategory הקיים,
 * אותה פונקציה שכבר משמשת בהוספה ידנית), ומזהה בנפרד שורת כותרת/שם-רשימה
 * כדי שלא תיכנס בטעות כפריט קנייה. לא "חכם" מעבר לזה בכוונה - מסך
 * הסקירה/עריכה בצד הלקוח הוא קו ההגנה האמיתי נגד טעויות OCR.
 */
export function parseOcrList(rawText: string): ParsedOcrList {
  const lines = rawText.split(/\r?\n/);
  const seen = new Set<string>();
  const items: OcrListItem[] = [];
  let detectedTitle: string | null = null;

  for (const rawLine of lines) {
    const cleaned = rawLine.replace(LEADING_MARKERS, '').trim();
    if (cleaned.length < MIN_NAME_LENGTH || cleaned.length > MAX_NAME_LENGTH) continue;
    if (DATE_OR_NUMBER_LINE.test(cleaned)) continue;
    if (OCR_FAILURE_STRINGS.has(cleaned.toUpperCase())) continue;
    if (OCR_STATUS_MESSAGE.test(cleaned)) continue;

    // דה-דופליקציה - לפעמים אותה שורה מזוהה פעמיים (למשל עיצוב עם קו מתחת כל פריט)
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const category = detectCategory(cleaned) as ProductCategory;

    // כותרת/שם הרשימה - נתפס פעם אחת בלבד (השורה הראשונה שנראית ככזו),
    // לא נכנס לרשימת הפריטים.
    if (!detectedTitle && looksLikeTitle(cleaned, category)) {
      detectedTitle = cleaned;
      continue;
    }

    items.push({ name: cleaned, category });
  }

  return { items, detectedTitle };
}
