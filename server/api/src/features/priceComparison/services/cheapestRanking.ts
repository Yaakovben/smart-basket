import type { PriceChainTotal, PriceMatch } from './priceComparison.types';

// לוגיקה טהורה (בלי DB) של דירוג הרשתות - בקובץ נפרד כדי שאפשר יהיה לבדוק אותה.

const round2 = (n: number) => Math.round(n * 100) / 100;

// רשת נכנסת לדירוג "הכי זול" רק אם כיסתה לפחות 60% ממה שהרשת המכסה ביותר כיסתה.
export const MIN_RANKING_COVERAGE = 0.6;

// השוואה על מחירי סניף מאומתים בלבד רק אם לפחות 60% מהרשתות עם התאמות מאומתות.
export const MIN_VERIFIED_CHAIN_SHARE = 0.6;

// מסמן isComplete ("סל שלם" - זיהתה הכי הרבה מוצרים) ו-isCheapest + savings
// (השוואה תפוחים-לתפוחים על הסט המשותף של מוצרים שזוהו בכל הרשתות עם נתונים).
// משנה את chainTotals in-place.
export function markCheapestAndComplete(chainTotals: PriceChainTotal[]): void {
  const maxMatched = chainTotals.reduce((m, c) => Math.max(m, c.matchedCount), 0);
  if (maxMatched > 0) {
    for (const ct of chainTotals) {
      ct.isComplete = ct.matchedCount === maxMatched;
    }
  }

  // קביעת "הכי זול" על בסיס תפוחים-לתפוחים: רק המוצרים שכל הרשתות עם נתונים זיהו.
  // אחרת רשת שזיהתה דווקא את המוצרים היקרים תיראה יקרה גם אם בפועל היא זולה,
  // ורשת שזיהתה רק את הזולים תיראה זולה בלי להיות באמת.
  // כשיש מחירים מאומתים בסניפים, משווים רק אותם: מחיר "הזול ברשת" הוא הטיה
  // כלפי מטה (הסניף הזול בארץ) ולא מה שהלקוח ישלם בסניף שלו. אם אין בכלל
  // מחירי סניף (למשל לא סונכרנו) נשארים עם ההשוואה הכלל-רשתית.
  // רק כשרוב הרשתות מאומתות: אם רשת אחת בלבד (או מעט) מאומתת, השוואה של מאומתים
  // בלבד הייתה פוסלת את כל השאר מהדירוג. אז נשארים בהשוואה כלל-רשתית עקבית.
  const matchedChains = chainTotals.filter(c => c.hasData && c.matchedCount > 0);
  const verifiedChains = matchedChains.filter(c => c.matches.some(m => m.matched && m.priceVerifiedAtBranch));
  const useVerifiedOnly = matchedChains.length > 0
    && verifiedChains.length / matchedChains.length >= MIN_VERIFIED_CHAIN_SHARE;
  const isComparable = (m: PriceMatch) => m.matched && (!useVerifiedOnly || !!m.priceVerifiedAtBranch);

  const withComparable = chainTotals.filter(c => c.hasData && c.matches.some(isComparable));
  if (withComparable.length === 0) return;
  // רשת שכיסתה רק חלק קטן מהסל לא נכנסת לדירוג: אחרת החיתוך המשותף קורס
  // לכמה מוצרים בודדים והדירוג של כל השאר נעשה חסר משמעות.
  const comparableCount = (c: PriceChainTotal) => c.matches.filter(isComparable).length;
  const maxComparable = withComparable.reduce((m, c) => Math.max(m, comparableCount(c)), 0);
  const dataChains = withComparable.filter(c => comparableCount(c) >= Math.ceil(maxComparable * MIN_RANKING_COVERAGE));

  const idSets = dataChains.map(c =>
    new Set(c.matches.filter(isComparable).map(m => m.productId))
  );
  // חיתוך — מוצרים שמופיעים בכל הרשתות עם הנתונים
  const commonIds = idSets.reduce<Set<string> | null>((acc, s) => {
    if (acc === null) return new Set(s);
    const next = new Set<string>();
    for (const id of acc) if (s.has(id)) next.add(id);
    return next;
  }, null) ?? new Set<string>();

  if (commonIds.size > 0) {
    // השוואה על תת-הסל המשותף
    const comparableByChain = new Map<string, number>();
    for (const ct of dataChains) {
      const sum = ct.matches
        .filter(m => isComparable(m) && commonIds.has(m.productId))
        .reduce((s, m) => s + m.price * m.userQuantity, 0);
      comparableByChain.set(ct.chainId, sum);
    }
    const entries = [...comparableByChain.entries()].sort((a, b) => a[1] - b[1]);
    const cheapestId = entries[0][0];
    const maxComp = entries[entries.length - 1][1];
    for (const ct of chainTotals) {
      if (ct.chainId === cheapestId) ct.isCheapest = true;
      const comp = comparableByChain.get(ct.chainId);
      // החיסכון משקף את הפער על תת-הסל המשותף — מספר הוגן ויציב
      if (comp !== undefined) ct.savings = round2(maxComp - comp);
    }
  } else {
    // אין מוצר משותף בכלל — נופלים ללוגיקה הישנה: הזול ביותר מבין השלמות
    const completeChains = chainTotals.filter(c => c.isComplete);
    if (completeChains.length > 0) {
      const sorted = [...completeChains].sort((a, b) => a.total - b.total);
      const cheapestId = sorted[0].chainId;
      const maxTotal = sorted[sorted.length - 1].total;
      for (const ct of chainTotals) {
        if (ct.chainId === cheapestId) ct.isCheapest = true;
        if (ct.isComplete) ct.savings = round2(maxTotal - ct.total);
      }
    }
  }
}
