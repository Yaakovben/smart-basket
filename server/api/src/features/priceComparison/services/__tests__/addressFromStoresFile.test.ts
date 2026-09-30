import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressFromStoresFile } from '../priceSync.service';

// כתובות כפי שמופיעות בקובץ הסניפים של דור אלון
test('כתובת מקובץ הסניפים: בלי תווי שורה מקודדים, ובלי ערכים שאינם כתובת', () => {
  assert.equal(addressFromStoresFile("רח' צהל 77 חדרה, ליד מכבי אש &#x0D;"), "רח' צהל 77 חדרה, ליד מכבי אש");
  assert.equal(addressFromStoresFile('כניסה למושב נווה ירק, כביש מספר 40&#x0D;'), 'כניסה למושב נווה ירק, כביש מספר 40');
  assert.equal(addressFromStoresFile('unknown'), undefined);
  assert.equal(addressFromStoresFile('&#x0D;'), undefined);
  assert.equal(addressFromStoresFile('הרצל 5'), 'הרצל 5');
});
