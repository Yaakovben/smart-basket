import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retryDownload, isPermanentDownloadError } from '../downloadRetry';

test('תקלה רגעית מקבלת עוד ניסיון, ו-404 לא', async () => {
  let calls = 0;
  const ok = await retryDownload(async () => { if (++calls < 3) throw new Error('timeout of 60000ms exceeded'); return 'קובץ'; }, 3, 1);
  assert.equal(ok, 'קובץ');
  assert.equal(calls, 3);

  let missing = 0;
  await assert.rejects(retryDownload(async () => { missing++; throw new Error('carrefour_download_http_404'); }, 3, 1));
  assert.equal(missing, 1);

  assert.equal(isPermanentDownloadError({ response: { status: 403 } }), true);
  assert.equal(isPermanentDownloadError({ response: { status: 503 } }), false);
  assert.equal(isPermanentDownloadError(new Error('socket hang up')), false);
});
