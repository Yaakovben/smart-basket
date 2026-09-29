import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFcmMessage, buildApnsPayload, decodeSecret, isDeadFcmToken, isDeadApnsToken, ANDROID_CHANNEL_ID,
} from '../nativePushPayload';

const msg = { title: 'רשימה עודכנה', body: 'חלב נוסף', url: '/list/abc', data: { listId: 'abc', type: 'product_add', notificationId: undefined } };

test('FCM: כותרת, גוף, ערוץ ואייקון, ונתונים רק כמחרוזות בלי undefined', () => {
  const m = buildFcmMessage('tok', msg).message;
  assert.equal(m.token, 'tok');
  assert.deepEqual(m.notification, { title: 'רשימה עודכנה', body: 'חלב נוסף' });
  assert.equal(m.android.notification.channel_id, ANDROID_CHANNEL_ID);
  assert.deepEqual(m.data, { url: '/list/abc', listId: 'abc', type: 'product_add' });
  assert.equal('notificationId' in m.data, false);
});

test('APNs: alert עם כותרת וגוף, וה-url לצד aps כדי שיגיע בלחיצה', () => {
  const p = buildApnsPayload(msg);
  assert.deepEqual(p.aps.alert, { title: 'רשימה עודכנה', body: 'חלב נוסף' });
  assert.equal(p.aps.sound, 'default');
  assert.equal((p as Record<string, unknown>).url, '/list/abc');
});

test('decodeSecret: JSON כמו שהוא, base64, ו-\\n מילולי במפתח', () => {
  const json = '{"a":1}';
  assert.equal(decodeSecret(json), json);
  assert.equal(decodeSecret(Buffer.from(json).toString('base64')), json);
  const pem = '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----';
  assert.equal(decodeSecret(pem), '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----');
  assert.equal(decodeSecret('   '), '');
});

test('FCM: זיהוי טוקן מת מול שגיאה זמנית', () => {
  assert.equal(isDeadFcmToken(404, ''), true);
  assert.equal(isDeadFcmToken(400, '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}'), true);
  assert.equal(isDeadFcmToken(500, 'internal'), false);
  assert.equal(isDeadFcmToken(429, 'quota'), false);
});

test('APNs: 410 ו-BadDeviceToken מתים, שגיאת שרת לא', () => {
  assert.equal(isDeadApnsToken(410, 'Unregistered'), true);
  assert.equal(isDeadApnsToken(400, 'BadDeviceToken'), true);
  assert.equal(isDeadApnsToken(500, 'InternalServerError'), false);
  assert.equal(isDeadApnsToken(403, 'ExpiredProviderToken'), false);
});
