import type { NearestBranch } from './branches.service';

export interface PriceMatch {
  productId: string;
  userProductName: string;
  userQuantity: number;
  normalizedName: string;
  matched: boolean;
  chainId: string;
  chainName: string;
  itemName: string;
  itemNameNormalized?: string;
  price: number;
  barcode: string;
  matchConfidence: number; // 0 עד 1 — אחוז ה-tokens של המשתמש שנמצאו במוצר
  matchedTokens: string[];
  userTokens: string[];
  manufacturerName?: string;
}

// קבוצת פריטים לפי רשימה - זה ה-unit המרכזי החדש
export interface PriceListGroup {
  listId: string;
  listName: string;
  listIcon: string;
  listColor: string;
  isGroup: boolean;
  pendingCount: number;         // סה"כ פריטים ברשימה שטרם נקנו
  matchedCount: number;         // כמה מהם זוהו
  unmatchedCount: number;       // כמה לא זוהו
  estimatedTotal: number;       // סה"כ לפריטים שזוהו בלבד
  matches: PriceMatch[];        // הפירוט (כל הפריטים, זוהו + לא זוהו)
}

// סיכום עלות סל לרשת אחת - משמש לתצוגה השוואתית בין רשתות
export interface PriceChainTotal {
  chainId: string;
  chainName: string;
  total: number;
  matchedCount: number;
  unmatchedCount: number;
  isCheapest: boolean;
  isComplete: boolean;
  savings: number;
  matches: PriceMatch[];
  // true אם יש לרשת נתונים במאגר. false = הפורטל של הרשת לא פרסם היום.
  // מאפשר ל-UI להבדיל בין "אין התאמות" (הרשת קיימת אבל מוצרי המשתמש לא נמצאו)
  // לבין "אין נתונים היום" (הרשת לא פרסמה קובץ היום)
  hasData: boolean;
  // הסניף הקרוב ביותר למיקום המשתמש (כשהמשתמש שיתף מיקום).
  // undefined כשהמשתמש לא שיתף מיקום או כשאין לרשת סניפים ב-seed.
  nearestBranch?: NearestBranch;
}

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;            // הרשת ה"ראשית" (הזולה ביותר) - לתאימות אחורה
  totalPrices: number;          // כמה מוצרים יש במאגר של הרשת הראשית
  lists: PriceListGroup[];      // חלוקה לפי רשימה (ע"פ הרשת הראשית)
  grandTotal: number | null;    // סה"כ כל הרשימות (בערך של הרשת הראשית)
  totalMatched: number;
  totalUnmatched: number;
  totalPending: number;
  chainTotals: PriceChainTotal[]; // השוואה בין כל הרשתות הפעילות (ממוין מהזולה ליקרה)
  disclaimer: string;
  lastUpdatedISO: string | null;
  sourceName: string;
  sourceUrl: string;
}
