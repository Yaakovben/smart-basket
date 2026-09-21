import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normStoreId, makeStoreIdResolver } from '../storeId';

test('אפסים מובילים לא משנים את מזהה הסניף', () => {
  assert.equal(normStoreId('012'), '12');
  assert.equal(normStoreId('12'), '12');
  assert.equal(normStoreId(' 0034 '), '34');
});

test('מזהה שכולו אפסים נשאר "0" ולא מחרוזת ריקה', () => {
  assert.equal(normStoreId('000'), '0');
});

test('מזהים לא-מספריים לא נפגעים', () => {
  assert.equal(normStoreId('osm-node-4153813576'), 'osm-node-4153813576');
});

test('resolver מזהה סניף גם כשהאפסים שונים ומחזיר את המזהה מטבלת המחירים', () => {
  const r = makeStoreIdResolver(new Set(['034', '7']));
  assert.equal(r.isPriced('34'), true);
  assert.equal(r.resolve('34'), '034');
  assert.equal(r.resolve('007'), '7');
});

test('סניף בלי מחירים נשאר עם המזהה המקורי', () => {
  const r = makeStoreIdResolver(new Set(['034']));
  assert.equal(r.isPriced('99'), false);
  assert.equal(r.resolve('99'), '99');
});

test('בלי קבוצת מחירים - שום סניף לא נחשב מתומחר', () => {
  const r = makeStoreIdResolver();
  assert.equal(r.isPriced('1'), false);
  assert.equal(r.resolve('1'), '1');
});
