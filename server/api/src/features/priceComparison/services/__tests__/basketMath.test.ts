import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceLine, compareBaskets } from '../basketMath';

const offer = (minQty: number, price: number) => ({ promotionId: 'P', description: `${minQty} ב-${price}`, minQty, price });

test('בלי מבצע: כמות כפול מחיר', () => {
  const r = priceLine(2, 4.9, []);
  assert.equal(r.total, 9.8);
  assert.equal(r.promotion, undefined);
});

test('3 ב-10: שלוש יחידות במחיר מבצע, והיתרה במחיר רגיל', () => {
  assert.equal(priceLine(3, 4.9, [offer(3, 10)]).total, 10);
  assert.equal(priceLine(4, 4.9, [offer(3, 10)]).total, 14.9);
  assert.equal(priceLine(6, 4.9, [offer(3, 10)]).total, 20);
});

test('כמות מתחת למינימום: המבצע לא מופעל', () => {
  const r = priceLine(2, 4.9, [offer(3, 10)]);
  assert.equal(r.total, 9.8);
  assert.equal(r.promotion, undefined);
});

test('מבצע שלא מוזיל לא מופעל, ונבחר הזול מבין כמה', () => {
  assert.equal(priceLine(1, 5, [offer(1, 6)]).promotion, undefined);
  const r = priceLine(2, 5, [offer(2, 9), offer(1, 4)]);
  assert.equal(r.total, 8);
  assert.equal(r.promotion?.price, 4);
  assert.equal(r.regularTotal, 10);
});

test('סדר סלים: שלם יותר קודם, ואז הזול', () => {
  const baskets = [
    { itemsFound: 4, basketTotal: 50 },
    { itemsFound: 5, basketTotal: 90 },
    { itemsFound: 5, basketTotal: 80 },
  ].sort(compareBaskets);
  assert.deepEqual(baskets.map(b => b.basketTotal), [80, 90, 50]);
});
