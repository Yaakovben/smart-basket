import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressKey } from '../addressKey';

// זוגות אמיתיים: הכתובת בקובץ הסניפים מול נקודת החנות ב-OpenStreetMap
test('מפתח כתובת: אותו רחוב ומספר גם בכתיב שונה', () => {
  assert.equal(addressKey("שד' מדע 77"), addressKey('שדרות מדע 77'));
  assert.equal(addressKey('בת שבע 1 מתחם טלרד'), addressKey('בת שבע 1'));
  assert.equal(addressKey('החרושת 10 מתחם חוצות המפרץ'), addressKey('החרושת 10'));
  assert.notEqual(addressKey('החרושת 10'), addressKey('החרושת 12'));
  assert.equal(addressKey('מרכז מסחרי'), null);
  assert.equal(addressKey(undefined), null);
});
