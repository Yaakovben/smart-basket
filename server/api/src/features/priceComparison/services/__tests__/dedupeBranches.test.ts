import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeBranches } from '../branches.service';

test('סניף שנשמר פעמיים (עם ובלי אפסים מובילים) מוצג פעם אחת, עם המיקום', () => {
  const out = dedupeBranches([
    { chainId: 'super_sapir', storeId: '022', coordSource: 'unknown', lastSyncedAt: new Date('2026-09-29') },
    { chainId: 'super_sapir', storeId: '22', lat: 33.2, coordSource: 'geocoded', lastSyncedAt: new Date('2026-09-20') },
    { chainId: 'shufersal', storeId: '22', lat: 32, coordSource: 'portal' },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out.find(b => b.chainId === 'super_sapir')!.lat, 33.2);
});

test('בשוויון איכות מיקום נבחר העדכני', () => {
  const out = dedupeBranches([
    { chainId: 'a', storeId: '001', lat: 1, coordSource: 'geocoded', lastSyncedAt: new Date('2026-09-01') },
    { chainId: 'a', storeId: '1', lat: 2, coordSource: 'geocoded', lastSyncedAt: new Date('2026-09-29') },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].lat, 2);
});
