import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markCheapestAndComplete } from '../cheapestRanking';
import type { PriceChainTotal, PriceMatch } from '../priceComparison.types';

// בניית התאמה. barcode זהה בין רשתות לאותו productId - אותו מוצר בדיוק.
const match = (productId: string, price: number, opts: { verified?: boolean; matched?: boolean } = {}): PriceMatch => ({
  productId,
  userProductName: productId,
  userQuantity: 1,
  normalizedName: productId,
  matched: opts.matched ?? true,
  chainId: 'x',
  chainName: 'x',
  itemName: productId,
  price,
  barcode: `bc-${productId}`,
  matchConfidence: 1,
  matchedTokens: [],
  userTokens: [],
  priceVerifiedAtBranch: opts.verified,
});

const chain = (chainId: string, matches: PriceMatch[], hasData = true): PriceChainTotal => {
  const matchedOnes = matches.filter(m => m.matched);
  return {
    chainId, chainName: chainId,
    total: matchedOnes.reduce((s, m) => s + m.price, 0),
    matchedCount: matchedOnes.length,
    unmatchedCount: matches.length - matchedOnes.length,
    isCheapest: false, isComplete: false, savings: 0,
    matches, hasData,
  };
};

const cheapestIds = (chains: PriceChainTotal[]) => chains.filter(c => c.isCheapest).map(c => c.chainId);

test('הזולה מסומנת והחיסכון הוא הפער מול היקרה', () => {
  const a = chain('a', [match('p1', 10), match('p2', 20)]);
  const b = chain('b', [match('p1', 12), match('p2', 25)]);
  markCheapestAndComplete([a, b]);
  assert.deepEqual(cheapestIds([a, b]), ['a']);
  assert.equal(a.savings, 7);
  assert.equal(b.savings, 0);
});

test('השוואה על תת-הסל המשותף בלבד: רשת שזיהתה עוד מוצר יקר לא נראית יקרה', () => {
  // b זולה יותר על המוצר המשותף, אבל זיהתה גם מוצר יקר שa לא זיהתה
  const a = chain('a', [match('p1', 10), match('p2', 0, { matched: false })]);
  const b = chain('b', [match('p1', 8), match('p2', 100)]);
  markCheapestAndComplete([a, b]);
  assert.deepEqual(cheapestIds([a, b]), ['b']);
  assert.equal(b.isComplete, true);
  assert.equal(a.isComplete, false);
});

test('רשת עם כיסוי נמוך מ-60% לא נכנסת לדירוג ולא מקריסה את החיתוך', () => {
  const items = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const a = chain('a', items.map(id => match(id, 10)));
  const b = chain('b', items.map(id => match(id, 9)));
  // c זיהתה רק מוצר אחד (20%) - והוא הכי זול בהרבה
  const c = chain('c', [match('p1', 1), ...items.slice(1).map(id => match(id, 0, { matched: false }))]);
  markCheapestAndComplete([a, b, c]);
  assert.deepEqual(cheapestIds([a, b, c]), ['b']);
  assert.equal(c.savings, 0);
});

test('רשת בלי נתונים לא משתתפת ולא מסומנת', () => {
  const a = chain('a', [match('p1', 10)]);
  const empty = chain('empty', [match('p1', 0, { matched: false })], false);
  markCheapestAndComplete([a, empty]);
  assert.deepEqual(cheapestIds([a, empty]), ['a']);
  assert.equal(empty.isCheapest, false);
});

test('כשרוב הרשתות מאומתות בסניף, משווים רק מחירים מאומתים', () => {
  // כל 3 הרשתות מאומתות. ב-p3 של b המחיר לא מאומת (1 ש"ח, הערכה ארצית) ולכן לא נספר.
  const a = chain('a', [match('p1', 10, { verified: true }), match('p2', 5, { verified: true }), match('p3', 3, { verified: true })]);
  const b = chain('b', [match('p1', 9, { verified: true }), match('p2', 4, { verified: true }), match('p3', 1, { verified: false })]);
  const c = chain('c', [match('p1', 11, { verified: true }), match('p2', 4, { verified: true }), match('p3', 2, { verified: true })]);
  markCheapestAndComplete([a, b, c]);
  // המשותף המאומת הוא p1+p2: a=15, b=13, c=15. אילו p3 הלא-מאומת נספר, הפער היה 4 ולא 2.
  assert.deepEqual(cheapestIds([a, b, c]), ['b']);
  assert.equal(b.savings, 2);
});

test('רשת שרק חצי מהסל שלה מאומת מוחרגת מהדירוג כשהרוב מאומתות', () => {
  const a = chain('a', [match('p1', 10, { verified: true }), match('p2', 5, { verified: true })]);
  const b = chain('b', [match('p1', 1, { verified: true }), match('p2', 1, { verified: false })]);
  const c = chain('c', [match('p1', 11, { verified: true }), match('p2', 4, { verified: true })]);
  markCheapestAndComplete([a, b, c]);
  assert.equal(b.isCheapest, false);
  assert.deepEqual(cheapestIds([a, b, c]), ['a']);
});

test('רשת אחת בלבד מאומתת: לא פוסלים את השאר, חוזרים להשוואה כלל-רשתית', () => {
  // רק a מאומתת (1 מתוך 3 = 33% < 60%). לפי הכלל השגוי a הייתה מנצחת אוטומטית.
  const a = chain('a', [match('p1', 10, { verified: true })]);
  const b = chain('b', [match('p1', 8, { verified: false })]);
  const c = chain('c', [match('p1', 9, { verified: false })]);
  markCheapestAndComplete([a, b, c]);
  assert.deepEqual(cheapestIds([a, b, c]), ['b']);
});
