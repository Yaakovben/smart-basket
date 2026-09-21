import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBarcodeStats, needsExplicitRow, resolveBranchPrice, exceedsExceptionBudget, MAX_EXCEPTION_ROWS_PER_CHAIN } from '../branchPricing';

const item = (storeId: string, barcode: string, price: number) => ({ storeId, barcode, price });

test('המחיר הנפוץ הוא זה שהכי הרבה סניפים גובים', () => {
  const items = [item('1', 'a', 10), item('2', 'a', 10), item('3', 'a', 12)];
  const stats = buildBarcodeStats(items, 3);
  assert.equal(stats.get('a')!.modalPrice, 10);
  assert.equal(stats.get('a')!.storeCount, 3);
});

test('בשוויון בין מחירים נבחר הנמוך', () => {
  const stats = buildBarcodeStats([item('1', 'a', 12), item('2', 'a', 10)], 2);
  assert.equal(stats.get('a')!.modalPrice, 10);
});

test('הכיסוי הוא חלק הסניפים שמוכרים את המוצר', () => {
  const stats = buildBarcodeStats([item('1', 'a', 5), item('2', 'a', 5)], 4);
  assert.equal(stats.get('a')!.coverage, 0.5);
});

test('סניף שמופיע פעמיים לאותו ברקוד נספר פעם אחת', () => {
  const stats = buildBarcodeStats([item('1', 'a', 5), item('1', 'a', 5), item('2', 'a', 6)], 2);
  assert.equal(stats.get('a')!.storeCount, 2);
});

test('שורה מפורשת נשמרת רק לחריגה או למוצר בכיסוי נמוך', () => {
  const wide = { modalPrice: 10, storeCount: 95, coverage: 0.95 };
  assert.equal(needsExplicitRow(10, wide), false); // אותו מחיר, כיסוי גבוה: אין צורך
  assert.equal(needsExplicitRow(8.9, wide), true); // חריגה
  const rare = { modalPrice: 10, storeCount: 10, coverage: 0.1 };
  assert.equal(needsExplicitRow(10, rare), true); // כיסוי נמוך: היעדר שורה היה מטעה
  assert.equal(needsExplicitRow(10, undefined), true);
});

test('חישוב אחוז החיסכון: ברשת אחידה כמעט לא נשמרות שורות', () => {
  // 100 סניפים, מוצר אחד: 95 במחיר 10, חמישה במחיר 9
  const items = Array.from({ length: 100 }, (_, i) => item(String(i), 'a', i < 95 ? 10 : 9));
  const stats = buildBarcodeStats(items, 100);
  const stored = items.filter(it => needsExplicitRow(it.price, stats.get(it.barcode))).length;
  assert.equal(stored, 5);
});

test('שורה מפורשת מנצחת ומסומנת מאומתת', () => {
  const r = resolveBranchPrice({ explicit: 8.9, modalPrice: 10, coverage: 0.95, storeHasPrices: true, chainMin: 8 });
  assert.deepEqual(r, { price: 8.9, verified: true, inferred: false });
});

test('בלי שורה, במוצר בכיסוי גבוה ובסניף מסונכרן: המחיר הנפוץ מוסק ומאומת', () => {
  const r = resolveBranchPrice({ modalPrice: 10, coverage: 0.95, storeHasPrices: true, chainMin: 8 });
  assert.deepEqual(r, { price: 10, verified: true, inferred: true });
});

test('סניף שלא סונכרן: לא מסיקים, המחיר הנפוץ מוצג כהערכה בלבד', () => {
  const r = resolveBranchPrice({ modalPrice: 10, coverage: 0.95, storeHasPrices: false, chainMin: 8 });
  assert.deepEqual(r, { price: 10, verified: false, inferred: false });
});

test('מוצר בכיסוי נמוך בלי שורה: לא מסיקים שהסניף מוכר אותו', () => {
  const r = resolveBranchPrice({ modalPrice: 10, coverage: 0.2, storeHasPrices: true, chainMin: 8 });
  assert.equal(r.verified, false);
});

test('בלי מחיר נפוץ (נתונים ישנים) חוזרים למחיר הזול ברשת', () => {
  const r = resolveBranchPrice({ storeHasPrices: true, chainMin: 8 });
  assert.deepEqual(r, { price: 8, verified: false, inferred: false });
});

test('תקציב שורות: עד התקרה מותר, מעליה לא', () => {
  assert.equal(exceedsExceptionBudget(MAX_EXCEPTION_ROWS_PER_CHAIN), false);
  assert.equal(exceedsExceptionBudget(MAX_EXCEPTION_ROWS_PER_CHAIN + 1), true);
  assert.equal(exceedsExceptionBudget(0), false);
});
