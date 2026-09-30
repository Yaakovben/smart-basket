import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PriceRows } from '../priceRows';
import type { ChainPriceItem } from '../types';

const row = (storeId: string | undefined, price: number, extra: Partial<ChainPriceItem> = {}): ChainPriceItem =>
  ({ barcode: '729', itemName: 'חלב 3%', manufacturerName: 'תנובה', unitQty: 'ליטר', storeId, price, ...extra });

test('שורות צפופות: פרטי המוצר פעם אחת, ומה שמשתנה לכל סניף נשמר נכון', () => {
  const rows = new PriceRows();
  rows.add([row('1', 6.9, { blockedItem: true, itemPriceUpdateDate: '2026-09-01T10:00:00.000' })]);
  rows.add([row('2', 5.9, { unitOfMeasurePrice: 5.9 }), row(undefined, 7.1, { blockedItem: false })]);
  rows.add([{ barcode: '111', itemName: 'לחם', storeId: '1', price: 8 }]);
  assert.equal(rows.length, 4);
  const [a, b, c, d] = [...rows];
  assert.deepEqual([a.storeId, a.price, a.blockedItem, a.itemPriceUpdateDate], ['1', 6.9, true, '2026-09-01T10:00:00.000']);
  // שורה של סניף אחר לא יורשת את מה שמשתנה בין סניפים מהשורה הראשונה
  assert.deepEqual([b.storeId, b.price, b.blockedItem, b.itemPriceUpdateDate, b.unitOfMeasurePrice], ['2', 5.9, undefined, undefined, 5.9]);
  assert.equal(b.itemName, 'חלב 3%');
  assert.equal(b.manufacturerName, 'תנובה');
  assert.deepEqual([c.storeId, c.price, c.blockedItem], [undefined, 7.1, false]);
  assert.deepEqual([d.barcode, d.itemName, d.price], ['111', 'לחם', 8]);
});

test('גדילה מעבר לגודל ההתחלתי', () => {
  const rows = new PriceRows();
  const n = 70_000;
  rows.add(Array.from({ length: n }, (_, i) => row(String(i % 300), i / 100)));
  assert.equal(rows.length, n);
  assert.equal(rows.at(n - 1).price, (n - 1) / 100);
  assert.equal(rows.at(n - 1).storeId, String((n - 1) % 300));
});
