import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickCheapest, isAtStore, modalPrice, isStale, type CheapestCandidate } from '../scanPricing';
import { brandOfBranch } from '../scanBrands';

const chain = (chainId: string, price: number, count = 20): CheapestCandidate =>
  ({ chainId, chainName: chainId, price, branch: null, chainTypicalPrice: price, branchCount: count });
const branch = (chainId: string, price: number, typical: number): CheapestCandidate =>
  ({ chainId, chainName: chainId, price, branch: { storeId: '23', branchName: 'סניף', city: '' }, chainTypicalPrice: typical, branchCount: 1 });

test('הזול בכל הארץ: סניף בודד במחיר חריג מסומן, עם המחיר הרגיל ברשת', () => {
  // המקרה מהצילום: אושר עד 9.90 בסניף אחד, 18.90 בשאר
  const pick = pickCheapest([chain('osher_ad', 18.9), branch('osher_ad', 9.9, 18.9), chain('rami_levy', 18.9)])!;
  assert.equal(pick.price, 9.9);
  assert.equal(pick.singleBranchDeal, true);
  assert.equal(pick.chainTypicalPrice, 18.9);
  assert.notEqual(pick.branch, null);
});

test('בשוויון מחיר עדיף מחיר שחל על רוב הרשת', () => {
  const pick = pickCheapest([branch('a', 10, 12), chain('b', 10)])!;
  assert.equal(pick.chainId, 'b');
  assert.equal(pick.branch, null);
  assert.equal(pick.singleBranchDeal, false);
});

test('סניף זול מעט מהרגיל אינו "מחיר חריג"', () => {
  const pick = pickCheapest([branch('a', 17.9, 18.9), chain('b', 19.9)])!;
  assert.equal(pick.singleBranchDeal, false);
  assert.equal(pickCheapest([]), null);
});

test('אתה בסניף: קרוב מספיק, ורק כשהמיקום מדויק', () => {
  assert.equal(isAtStore(80), true);
  assert.equal(isAtStore(80, 30), true);
  assert.equal(isAtStore(200, 30), false);
  // דיוק 200 מטר: מרחק 180 עדיין בתוך טווח הסטייה
  assert.equal(isAtStore(180, 200), true);
  // מיקום לא מדויק (אנטנות): לא קובעים סניף
  assert.equal(isAtStore(50, 1500), false);
});

test('מחיר נפוץ: הכי הרבה סניפים, בשוויון הנמוך', () => {
  assert.equal(modalPrice([10, 10, 12]), 10);
  assert.equal(modalPrice([12, 10]), 10);
  assert.equal(modalPrice([]), null);
});

test('נתונים ישנים מ-48 שעות מסומנים', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  assert.equal(isStale(new Date('2026-09-22T01:00:00Z'), now), true);
  assert.equal(isStale(new Date('2026-09-29T04:00:00Z'), now), false);
});

test('מותג לפי תת-רשת, ובלי תת-רשת לפי שם הסניף', () => {
  assert.equal(brandOfBranch('super_sapir', { subChainName: 'נטו חיסכון' })?.name, 'נטו חיסכון');
  assert.equal(brandOfBranch('super_sapir', { storeName: 'עפולה נטו חיסכון* ת.' })?.name, 'נטו חיסכון');
  assert.equal(brandOfBranch('super_sapir', { subChainName: 'סופר ספיר', storeName: 'נטו חיסכון' }), undefined);
  assert.equal(brandOfBranch('shufersal', { storeName: 'יש חסד רכסים' })?.name, 'יש חסד');
  assert.equal(brandOfBranch('shufersal', { storeName: 'שלי באר יעקב' }), undefined);
  // שם מותג של רשת אחרת לא נתפס
  assert.equal(brandOfBranch('rami_levy', { storeName: 'נטו חיסכון' }), undefined);
});
