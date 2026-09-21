import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDateStamp, extractStoreIdFromName } from '../binaFileNames';

test('פורמט חדש: תאריך ושעה מופרדים במקף וסיומת באותיות גדולות', () => {
  const name = 'PriceFull7290058159628-000-065-20260921-045427.GZ';
  assert.equal(extractDateStamp(name), '20260921045427');
  assert.equal(extractStoreIdFromName(name), '065');
});

test('פורמט ישן: חתימה של 12 ספרות רצופות', () => {
  const name = 'PriceFull7290058159628-065-202609210454.gz';
  assert.equal(extractDateStamp(name), '202609210454');
  assert.equal(extractStoreIdFromName(name), '065');
});

test('הסניף הוא המקטע שלפני התאריך, לא תת-המותג', () => {
  assert.equal(extractStoreIdFromName('PriceFull7290058134977-001-012-20260921-050000.gz'), '012');
});

test('חתימה חדשה מאוחרת יותר גדולה מהקודמת בהשוואה לקסיקוגרפית', () => {
  const early = extractDateStamp('PriceFull1-000-065-20260921-045427.GZ');
  const late = extractDateStamp('PriceFull1-000-065-20260922-015659.GZ');
  assert.ok(late > early);
});

test('שם בלי חתימה תקינה מחזיר ריק', () => {
  assert.equal(extractDateStamp('Stores7290058159628.xml'), '');
  assert.equal(extractStoreIdFromName('Stores7290058159628.xml'), '');
});
