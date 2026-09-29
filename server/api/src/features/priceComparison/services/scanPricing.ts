/**
 * החלטות התצוגה של סריקת מוצר, בלי DB, כדי שאפשר לבדוק אותן:
 *  - "הכי זול בכל הארץ" נקבע רק ממחיר שאפשר להצביע עליו: סניף מזוהה, או המחיר
 *    שרוב סניפי הרשת גובים. מחיר זול בסניף בודד מסומן ככזה, עם המחיר הרגיל ברשת.
 *  - "אתה נמצא בסניף" לפי המרחק לסניף הקרוב ודיוק המיקום.
 *  - מחיר נפוץ של מותג (תת-רשת) לפי המחירים בסניפים שלו.
 */

// סניף בודד שמחירו נמוך מזה ביחס למחיר הנפוץ ברשת הוא "מחיר חריג בסניף אחד".
// באושר עד, למשל, יש כ-1,800 מוצרים שבסניף אחד מחירם נמוך ביותר מ-40% מהמחיר
// שבשאר הסניפים (9.90 מול 18.90). זה המחיר הרשמי של אותו סניף, אבל לא מה שישלם
// מי שנכנס לסניף אחר של הרשת, ולכן מוצג עם ההסבר.
export const SINGLE_BRANCH_DEAL_RATIO = 0.85;

export interface CheapestCandidate {
  chainId: string;
  chainName: string;
  price: number;
  // הסניף. null = המחיר שרוב סניפי הרשת גובים
  branch: { storeId: string; branchName: string; city: string } | null;
  chainTypicalPrice: number;
  // בכמה סניפים המחיר הזה (לסניף מזוהה: 1)
  branchCount: number;
}

export interface CheapestPick extends CheapestCandidate {
  // מחיר נמוך במיוחד שנמצא רק בסניף אחד (או בודדים) של הרשת
  singleBranchDeal: boolean;
}

// הזול מבין המועמדים. בשוויון מחיר עדיף מחיר שחל על רוב הרשת (יותר שימושי ללקוח)
export function pickCheapest(candidates: CheapestCandidate[]): CheapestPick | null {
  if (candidates.length === 0) return null;
  const best = [...candidates].sort((a, b) =>
    a.price - b.price
    || Number(a.branch !== null) - Number(b.branch !== null)
    || b.branchCount - a.branchCount)[0];
  const singleBranchDeal = best.branch !== null && best.price < best.chainTypicalPrice * SINGLE_BRANCH_DEAL_RATIO;
  return { ...best, singleBranchDeal };
}

// אילת ואזור אילות פטורים ממע"מ, והמחירים שם נמוכים בכ-15%. מחיר כזה כ"הכי זול בכל
// הארץ" מטעה כל מי שלא גר שם (נמצא: דור אלון "אילות" ₪1.50 מול ₪1.78 בשאר הארץ).
// ללקוח שנמצא באילת המחירים שם מוצגים כרגיל ב"קרוב אליך".
// העיר קובעת כשהיא ידועה; שם הסניף רק כשאין עיר (ובלי שם רחוב כמו "אח"י אילת" בחיפה)
const VAT_FREE = /(^|[^א-ת])(אילת|אילות)(?![א-ת])/;
export const isVatFreeZone = (branch: { branchName?: string; city?: string }): boolean => {
  const city = branch.city?.trim();
  if (city && !/^\d+$/.test(city)) return VAT_FREE.test(city);
  return VAT_FREE.test((branch.branchName ?? '').replace(/אח["״]י אילת/g, ''));
};

// מתחת למרחק הזה מהסניף הקרוב, המשתמש כנראה בתוכו (גודל סופר ממוצע + סטיית מיקום)
export const AT_STORE_BASE_M = 120;
// דיוק מיקום גרוע מזה לא מספיק כדי לקבוע באיזה סניף המשתמש נמצא
export const AT_STORE_MAX_ACCURACY_M = 250;

// האם המשתמש נמצא בסניף, לפי המרחק (מטרים) ודיוק המיקום (מטרים, אם ידוע)
export function isAtStore(distanceM: number, accuracyM?: number): boolean {
  if (accuracyM !== undefined && accuracyM > AT_STORE_MAX_ACCURACY_M) return false;
  return distanceM <= Math.max(AT_STORE_BASE_M, accuracyM ?? 0);
}

// המחיר הנפוץ (שהכי הרבה סניפים גובים; בשוויון הנמוך) מתוך מחירי סניפים
export function modalPrice(prices: number[]): number | null {
  if (prices.length === 0) return null;
  const counts = new Map<number, number>();
  for (const p of prices) {
    const c = Math.round(p * 100);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = -1;
  let bestCount = 0;
  for (const [c, n] of counts) {
    if (n > bestCount || (n === bestCount && c < best)) { best = c; bestCount = n; }
  }
  return best / 100;
}

// נתונים ישנים מזה מסומנים ללקוח (הרשתות מפרסמות כל יום)
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;
export const isStale = (updatedAt: Date, now = new Date()): boolean => now.getTime() - updatedAt.getTime() > STALE_AFTER_MS;
