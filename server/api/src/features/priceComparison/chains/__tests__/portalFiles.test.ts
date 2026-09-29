import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLatestPerStore } from '../portalFiles';

// שמות קבצים כפי שמופיעים בפורטל של קשת ב-29.9.2026: רוב הסניפים בתבנית הקצרה,
// ושניים גם בתבנית המלאה
test('קובץ עדכני לכל סניף בשתי תבניות השם, בלי כפילות', () => {
  const files = [
    'PriceFull7290785400000-001-014-20260929-001012.gz',
    'PriceFull7290785400000-014-202609290010.gz',
    'PriceFull7290785400000-020-202609290011.gz',
    'PriceFull7290785400000-020-202609280011.gz',
    'PriceFull7290785400000-318-202609290010.gz',
    'Price7290785400000-020-202609291200.gz',
    'Stores7290785400000-000-20260929-051000.xml',
  ].map(fname => ({ fname }));
  const picked = pickLatestPerStore(files, 'PriceFull');
  assert.deepEqual(picked.map(p => p.storeId).sort(), ['014', '020', '318']);
  assert.equal(picked.find(p => p.storeId === '020')!.path, 'PriceFull7290785400000-020-202609290011.gz');
  assert.equal(picked.find(p => p.storeId === '014')!.path, 'PriceFull7290785400000-001-014-20260929-001012.gz');
});
