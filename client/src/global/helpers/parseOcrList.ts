import { detectCategory } from './categoryDetector';
import type { ProductCategory } from '../types';

export interface OcrListItem {
  name: string;
  category: ProductCategory;
}

// תווי בולט/מספור/סימון-וי נפוצים שאנשים מוסיפים ליד כל שורה בפתק -
// מסירים לפני השמירה כדי שלא ייכנסו כחלק משם המוצר.
const LEADING_MARKERS = /^[\s]*(?:[•*\-–—▪●○□☐✓✔·]|\d{1,2}[.)])[\s]*/;

const MIN_NAME_LENGTH = 2;
// שורה ארוכה מזה כנראה רעש (OCR שחיבר בטעות כמה שורות פתק לאחת) ולא שם מוצר יחיד
const MAX_NAME_LENGTH = 60;

/**
 * הופך טקסט OCR גולמי (שורה לכל פריט בפתק, בדרך כלל) לרשימת מועמדים
 * להוספה - עם קטגוריה מזוהה אוטומטית לכל אחד (detectCategory הקיים,
 * אותה פונקציה שכבר משמשת בהוספה ידנית). לא "חכם" מעבר לזה בכוונה -
 * מסך הסקירה/עריכה בצד הלקוח הוא קו ההגנה האמיתי נגד טעויות OCR.
 */
export function parseOcrList(rawText: string): OcrListItem[] {
  const lines = rawText.split(/\r?\n/);
  const seen = new Set<string>();
  const items: OcrListItem[] = [];

  for (const rawLine of lines) {
    const cleaned = rawLine.replace(LEADING_MARKERS, '').trim();
    if (cleaned.length < MIN_NAME_LENGTH || cleaned.length > MAX_NAME_LENGTH) continue;

    // דה-דופליקציה - לפעמים אותה שורה מזוהה פעמיים (למשל עיצוב עם קו מתחת כל פריט)
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      name: cleaned,
      category: detectCategory(cleaned) as ProductCategory,
    });
  }

  return items;
}
