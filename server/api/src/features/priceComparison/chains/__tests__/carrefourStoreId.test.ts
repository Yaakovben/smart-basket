import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withFileStoreId } from '../carrefour.adapter';

// בקובץ של סניף 407 כתוב בפנים 117, מספור ישן: 117 הוא סניף אחר ברשת
test('קרפור: מזהה הסניף לפי שם הקובץ, לא לפי השדה שבתוכו', () => {
  const items = [{ storeId: '117', barcode: '1' }, { storeId: '117', barcode: '2' }];
  withFileStoreId(items, 'PriceFull7290055700007-001-407-20260929-051018.gz');
  assert.deepEqual(items.map(i => i.storeId), ['407', '407']);
  // שם קובץ לא מוכר: לא נוגעים
  const other = [{ storeId: '5' }];
  withFileStoreId(other, 'prices.xml');
  assert.equal(other[0].storeId, '5');
});
