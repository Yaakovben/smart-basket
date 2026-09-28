import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityFromStoresFile } from '../priceSync.service';

test('סמל יישוב של הלמ"ס מתורגם לשם העיר לפי הרשימה הרשמית', () => {
  assert.equal(cityFromStoresFile('3000'), 'ירושלים');
  assert.equal(cityFromStoresFile('8300'), 'ראשון לציון');
  assert.equal(cityFromStoresFile('3780'), 'ביתר עילית');
  assert.equal(cityFromStoresFile(' 7100 '), 'אשקלון');
});

test('שם עיר נשאר, וקוד לא מוכר או ריק לא נשמר', () => {
  assert.equal(cityFromStoresFile('באר שבע'), 'באר שבע');
  assert.equal(cityFromStoresFile('0'), undefined);
  assert.equal(cityFromStoresFile('99999'), undefined);
  assert.equal(cityFromStoresFile(''), undefined);
  assert.equal(cityFromStoresFile(undefined), undefined);
});
