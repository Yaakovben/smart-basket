import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coordsConflictWithName, findKnownCitiesAsWords, isCountryCentroid } from '../cityMatching';

test('עיר בשם הסניף כמילה שלמה בלבד', () => {
  assert.deepEqual(findKnownCitiesAsWords('שלי ת"א- בן יהודה').includes('יהוד'), false);
  assert.deepEqual(findKnownCitiesAsWords('יש חסד כנפי נשרים').includes('נשר'), false);
  assert.ok(findKnownCitiesAsWords('בית שמש - גליל').includes('בית שמש'));
});

// המקרים מהמאגר: שם הסניף הוא העיר, והגיאוקודינג שם אותו בעיר אחרת
test('מיקום שסותר את העיר בשם הסניף', () => {
  assert.equal(coordsConflictWithName(32.090, 34.814, 'בית שמש - גליל'), true); // רמת גן
  assert.equal(coordsConflictWithName(31.961, 34.778, 'עכו'), true); // ראשון לציון
  assert.equal(coordsConflictWithName(32.310, 34.870, 'נתניה'), false);
});

test('שם שמזכיר כמה ערים: מספיק שהמיקום ליד אחת', () => {
  // "ירושלים" כאן היא שם הרחוב בבני ברק
  assert.equal(coordsConflictWithName(32.083, 34.826, 'יש בני ברק- ירושלים'), false);
});

test('שם בלי עיר מוכרת, או עיר שהיא גם שם רחוב: אין סתירה', () => {
  assert.equal(coordsConflictWithName(31.707, 34.971, 'שדרות האמוראים 45'), false);
  assert.equal(coordsConflictWithName(32.1, 34.8, 'AM:PM'), false);
});

test('נקודת ברירת המחדל של הגיאוקודר', () => {
  assert.equal(isCountryCentroid(30.8952, 34.8752), true);
  assert.equal(isCountryCentroid(31.2518, 34.7915), false);
});
