import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webPushDeviceFromUserAgent } from '../pushDevice';

test('מנוי התראות מהאתר: זיהוי אייפון, אנדרואיד ומחשב', () => {
  assert.equal(webPushDeviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'), 'ios');
  assert.equal(webPushDeviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile'), 'android');
  assert.equal(webPushDeviceFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0'), 'desktop');
  assert.equal(webPushDeviceFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'), 'desktop');
  assert.equal(webPushDeviceFromUserAgent(undefined), 'desktop');
});
