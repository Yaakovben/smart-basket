import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PromoAccumulator, promoItemAppliesToStore, promoStoreIndex, promotionIsActive, promoUnitPrice,
  encodeStoreBitmap, bitmapHas, bitmapCount, MAX_ITEMS_PER_PROMOTION,
} from '../promoAggregation';
import type { ParsedPromotion, ParsedPromoFile } from '../../chains/promoXmlParser';

const NOW = new Date('2026-09-28T10:00:00Z');
const A = '7290000000001';
const B = '7290000000002';

const promo = (over: Partial<ParsedPromotion> = {}): ParsedPromotion => ({
  promotionId: 'P1',
  description: '3 ב-10',
  startDate: new Date('2026-09-01T00:00:00Z'),
  endDate: new Date('2026-12-31T00:00:00Z'),
  clubIds: [0],
  isCoupon: false,
  groups: [{ items: [{ barcode: A, minQty: 3, discountedPrice: 10 }] }],
  ...over,
});

const file = (storeId: string, promotions: ParsedPromotion[]): ParsedPromoFile => ({ storeId, promotions, itemsWithoutBarcode: 0 });

test('מפת ביטים: קידוד, בדיקה וספירה', () => {
  const bm = encodeStoreBitmap([0, 3, 9, 428], 429);
  assert.equal(bm.length, 72);
  assert.equal(bitmapHas(bm, 3), true);
  assert.equal(bitmapHas(bm, 4), false);
  assert.equal(bitmapHas(bm, 428), true);
  assert.equal(bitmapHas(bm, 5000), false);
  assert.equal(bitmapCount(bm), 4);
});

test('אותו מבצע בכל הסניפים: מסמך אחד, פריט בלי מפת סניפים', () => {
  const acc = new PromoAccumulator(NOW);
  acc.addFile(file('001', [promo()]));
  acc.addFile(file('002', [promo()]));
  const { promotions } = acc.finish();
  assert.equal(promotions.length, 1);
  assert.deepEqual(promotions[0].items, [{ barcode: A, minQty: 3, price: 10 }]);
  assert.deepEqual(acc.storeIds, ['1', '2']);
});

test('כל סניף מפרט פריטים אחרים: מבצע אחד, ולכל פריט הסניפים שלו', () => {
  const acc = new PromoAccumulator(NOW);
  acc.addFile(file('1', [promo({ groups: [{ items: [{ barcode: A, minQty: 3, discountedPrice: 10 }, { barcode: B, minQty: 3, discountedPrice: 10 }] }] })]));
  acc.addFile(file('2', [promo()]));
  acc.addFile(file('3', [promo({ groups: [{ items: [{ barcode: A, minQty: 3, discountedPrice: 12 }] }] })]));
  const { promotions } = acc.finish();
  assert.equal(promotions.length, 1);
  const items = promotions[0].items;
  assert.equal(items.length, 3);
  const aCheap = items.find(i => i.barcode === A && i.price === 10)!;
  const aDear = items.find(i => i.barcode === A && i.price === 12)!;
  const b = items.find(i => i.barcode === B)!;
  // אינדקסים לפי סדר ההופעה: סניף 1 = 0, סניף 2 = 1, סניף 3 = 2
  assert.deepEqual([0, 1, 2].map(i => promoItemAppliesToStore(aCheap, i)), [true, true, false]);
  assert.deepEqual([0, 1, 2].map(i => promoItemAppliesToStore(aDear, i)), [false, false, true]);
  assert.deepEqual([0, 1, 2].map(i => promoItemAppliesToStore(b, i)), [true, false, false]);
});

test('מסוננים: פג תוקף, קופון, חבילה, בלי מחיר', () => {
  const acc = new PromoAccumulator(NOW);
  acc.addFile(file('1', [
    promo({ promotionId: 'expired', endDate: new Date('2026-09-01T00:00:00Z') }),
    promo({ promotionId: 'coupon', isCoupon: true }),
    promo({ promotionId: 'bundle', groups: [{ items: [{ barcode: 'a1', discountedPrice: 5 }] }, { items: [{ barcode: 'a2', discountedPrice: 5 }] }] }),
    promo({ promotionId: 'rate-only', groups: [{ items: [{ barcode: 'a3', discountRate: 10 }] }] }),
    promo({ promotionId: 'gift', groups: [{ items: [{ barcode: 'a4', discountedPrice: 5, isGift: true }] }] }),
    promo({ promotionId: 'ok' }),
  ]));
  const { promotions } = acc.finish();
  assert.deepEqual(promotions.map(p => p.promotionId), ['ok']);
  assert.deepEqual(acc.stats.skipped, { expired: 1, coupon: 1, bundle: 1, no_priced_items: 2, too_many_items: 0 });
});

test('הנחה כללית על אלפי פריטים לא נשמרת', () => {
  const items = Array.from({ length: MAX_ITEMS_PER_PROMOTION + 1 }, (_, i) => ({ barcode: String(i), discountedPrice: 1 }));
  const acc = new PromoAccumulator(NOW);
  acc.addFile(file('1', [promo({ groups: [{ items }] })]));
  assert.equal(acc.finish().promotions.length, 0);
  assert.equal(acc.stats.skipped.too_many_items, 1);
});

test('מועדון מסומן, ופריט בלי מחיר רגיל ברשת מסונן', () => {
  const acc = new PromoAccumulator(NOW);
  acc.addFile(file('1', [promo({ clubIds: [3], groups: [{ items: [
    { barcode: 'known', minQty: 1, discountedPrice: 5 },
    { barcode: 'unknown', minQty: 1, discountedPrice: 5 },
  ] }] })]));
  const { promotions } = acc.finish(new Set(['known']));
  assert.equal(promotions[0].clubOnly, true);
  assert.deepEqual(promotions[0].items.map(i => i.barcode), ['known']);
});

test('קובץ בלי מזהה סניף בתוכו משתמש במזהה משם הקובץ', () => {
  const acc = new PromoAccumulator(NOW);
  acc.addFile({ promotions: [promo()], itemsWithoutBarcode: 2 }, '065');
  assert.deepEqual(acc.storeIds, ['65']);
  assert.equal(acc.stats.itemsWithoutBarcode, 2);
});

test('אינדקס סניף לפי סדר הסנכרון, וסניף שלא סונכרן = אין מידע', () => {
  assert.equal(promoStoreIndex('002', ['1', '2']), 1);
  assert.equal(promoStoreIndex('9', ['1', '2']), undefined);
  assert.equal(promoItemAppliesToStore({}, undefined), false);
  assert.equal(promoItemAppliesToStore({}, 0), true);
});

test('פעיל לפי תאריכים, ומחיר ליחידה', () => {
  assert.equal(promotionIsActive({ startDate: new Date('2026-10-01'), endDate: undefined }, NOW), false);
  assert.equal(promotionIsActive({ startDate: undefined, endDate: new Date('2026-10-01') }, NOW), true);
  assert.equal(promoUnitPrice({ minQty: 3, price: 10 }), 3.33);
});
