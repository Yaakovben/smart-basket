import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectPriceFeedStats, validatePriceFeed, validateStoresFeed, validatePromoFeed, countDuplicateRows } from '../syncValidation';
import type { ChainPriceItem } from '../../chains/types';

const item = (barcode: string, price: number, storeId?: string): ChainPriceItem => ({ barcode, itemName: 'x', price, storeId });

test('סטטיסטיקת פיד: שורות בלי ברקוד, מחיר לא תקין, בלי סניף', () => {
  const s = collectPriceFeedStats([item('1', 5, '1'), item('', 5, '1'), item('2', 0, '1'), item('3', NaN, '1'), item('4', 7)]);
  assert.equal(s.total, 5);
  assert.equal(s.valid, 2);
  assert.equal(s.missingBarcode, 1);
  assert.equal(s.invalidPrice, 2);
  assert.equal(s.missingStore, 1);
  assert.equal(s.distinctBarcodes, 2);
});

test('פיד ריק נכשל', () => {
  assert.equal(validatePriceFeed(collectPriceFeedStats([])).ok, false);
});

test('רוב השורות פגומות = כשל (מבנה הקובץ השתנה)', () => {
  const s = collectPriceFeedStats([item('1', 5, '1'), item('', 5), item('', 5)]);
  const r = validatePriceFeed(s);
  assert.equal(r.ok, false);
  assert.match(r.reason!, /too_many_invalid_rows/);
});

test('ירידה חדה במספר המוצרים מול הסנכרון הקודם = כשל, ירידה מתונה תקינה', () => {
  const items = Array.from({ length: 300 }, (_, i) => item(String(i), 5, '1'));
  const s = collectPriceFeedStats(items);
  assert.equal(validatePriceFeed(s, 1000).ok, false);
  assert.equal(validatePriceFeed(s, 500).ok, true);
  // רשת קטנה: לא בודקים ירידה באחוזים
  assert.equal(validatePriceFeed(s, 400).ok, true);
});

test('כפילויות: שורות תקינות פחות זוגות (סניף, ברקוד) שונים', () => {
  assert.equal(countDuplicateRows(10, [3, 4, 2]), 1);
  assert.equal(countDuplicateRows(5, [3, 2]), 0);
});

test('סניפים: ריק או ירידה חדה נכשלים', () => {
  assert.equal(validateStoresFeed(0).ok, false);
  assert.equal(validateStoresFeed(10, 100).ok, false);
  assert.equal(validateStoresFeed(90, 100).ok, true);
  assert.equal(validateStoresFeed(3, 10).ok, true);
});

test('מבצעים: יותר מחצי מהקבצים נכשלו, או מבצעים שנעלמו', () => {
  assert.equal(validatePromoFeed({ filesOk: 0, filesTotal: 0, promotions: 0 }).ok, false);
  assert.equal(validatePromoFeed({ filesOk: 4, filesTotal: 10, promotions: 50 }).ok, false);
  assert.equal(validatePromoFeed({ filesOk: 10, filesTotal: 10, promotions: 0, previousPromotions: 20 }).ok, false);
  assert.equal(validatePromoFeed({ filesOk: 10, filesTotal: 10, promotions: 100, previousPromotions: 1000 }).ok, false);
  assert.equal(validatePromoFeed({ filesOk: 10, filesTotal: 10, promotions: 0, previousPromotions: 0 }).ok, true);
  assert.equal(validatePromoFeed({ filesOk: 9, filesTotal: 10, promotions: 800, previousPromotions: 1000 }).ok, true);
});

test('פיד מחירים ממעט סניפים (פורטל שמציג רק את קובצי היום) נחסם', () => {
  const items = Array.from({ length: 1000 }, (_, i) => item(String(i), 5, '134'));
  const s = collectPriceFeedStats(items);
  // קרפור אחרי חצות: קובץ של סניף אחד מול 160 שסונכרנו
  assert.match(validatePriceFeed(s, 1000, 1, 160).reason ?? '', /store_count_dropped/);
  assert.equal(validatePriceFeed(s, 1000, 150, 160).ok, true);
  // רשת קטנה: לא בודקים
  assert.equal(validatePriceFeed(s, 1000, 1, 3).ok, true);
});
