import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeListings } from '../portalFileCache';

const f = (fileName: string, fileDate: string) => ({ fileName, fileDate });

test('רשימת היום מושלמת מהשמורה, ורשומה של היום גוברת על שמורה עם אותו שם', () => {
  const today = [f('PriceFull-001-20260929', '2026-09-29 06:00')];
  const cached = [f('PriceFull-001-20260929', '2026-09-29 05:00'), f('PriceFull-002-20260928', '2026-09-28 06:00')];
  const merged = mergeListings(today, cached, e => e.fileName);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(e => e.fileName === 'PriceFull-001-20260929')!.fileDate, '2026-09-29 06:00');
});

test('בלי רשימה שמורה: רשימת היום כמו שהיא', () => {
  assert.deepEqual(mergeListings([f('a', '1')], [], e => e.fileName), [f('a', '1')]);
});
