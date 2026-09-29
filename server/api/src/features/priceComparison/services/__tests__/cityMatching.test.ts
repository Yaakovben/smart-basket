import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coordsConflictWithName, findKnownCitiesAsWords, isCountryCentroid, exactCityFromStoreName, findCbsLocalityIn, isArtifactCity } from '../cityMatching';

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

test('שם סניף שהוא בדיוק שם יישוב', () => {
  assert.equal(exactCityFromStoreName('עכו'), 'עכו');
  assert.equal(exactCityFromStoreName('כפר סבא'), 'כפר סבא');
  assert.equal(exactCityFromStoreName('אלפי מנשה'), 'אלפי מנשה');
  // שם שמכיל עיר אבל אינו רק העיר: לא נחשב (כאן "אילת" היא הרחוב)
  assert.equal(exactCityFromStoreName('שלי קרית חיים-אח"י אילת'), null);
  assert.equal(exactCityFromStoreName(undefined), null);
});

test('יישוב קטן מהרשימה הרשמית בשם הסניף', () => {
  assert.equal(findCbsLocalityIn('סופר ספיר אלפי מנשה* ת.'), 'אלפי מנשה');
  assert.equal(findCbsLocalityIn('סופר ספיר כוכב יעקב* ת.'), 'כוכב יעקב');
  assert.equal(findCbsLocalityIn('AM:PM'), null);
});

test('עיר שהושלמה מחיפוש הפוך של מיקום שגוי', () => {
  assert.equal(isArtifactCity('מועצה אזורית רמת נגב'), true);
  assert.equal(isArtifactCity('באר שבע'), false);
});
