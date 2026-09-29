import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPreciseHit, poiMatchesStore, storeNameTokens } from '../forwardGeocoder';

test('רק תוצאה ברמת רחוב או בניין, לא מרכז יישוב או מועצה', () => {
  assert.equal(isPreciseHit({ place_rank: 30 }), true);
  assert.equal(isPreciseHit({ place_rank: '26' }), true);
  assert.equal(isPreciseHit({ place_rank: 16 }), false); // עיר
  assert.equal(isPreciseHit({ place_rank: 12 }), false); // מועצה אזורית
  // LocationIQ בלי place_rank: לפי סוג
  assert.equal(isPreciseHit({ class: 'place' }), false);
  assert.equal(isPreciseHit({ class: 'boundary' }), false);
  assert.equal(isPreciseHit({ class: 'highway' }), true);
});

test('חיפוש חנות לפי שם: חייבת להיות חנות ששמה תואם את הסניף', () => {
  assert.deepEqual(storeNameTokens('נטו חיסכון בת ים* ת.'), ['נטו', 'חיסכון']);
  assert.equal(poiMatchesStore({ class: 'shop', name: 'נטו חיסכון' }, 'נטו חיסכון בת ים* ת.', 'בת ים'), true);
  assert.equal(poiMatchesStore({ class: 'shop', name: 'שופרסל דיל' }, 'נטו חיסכון בת ים* ת.', 'בת ים'), false);
  assert.equal(poiMatchesStore({ class: 'amenity', name: 'נטו חיסכון' }, 'נטו חיסכון בת ים* ת.', 'בת ים'), false);
});
