import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyAppleToken, APPLE_ISSUER, type AppleJwk } from '../appleTokenVerify';

// זוג מפתחות שמחקה את אפל: הפרטי חותם, הציבורי "מפורסם" כ-JWK
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'test-kid-1';
const jwk = { ...(publicKey.export({ format: 'jwk' }) as { n: string; e: string; kty: string }), kid: KID, alg: 'RS256', use: 'sig' } as AppleJwk;
const AUD = ['com.smartbasket.app'];
const keys = async () => [jwk];

const sign = (claims: Record<string, unknown>, opts: jwt.SignOptions = {}, key: crypto.KeyObject = privateKey) =>
  jwt.sign({ sub: 'apple-user-1', email: 'User@PrivateRelay.AppleID.com', email_verified: 'true', ...claims }, key, {
    algorithm: 'RS256', keyid: KID, issuer: APPLE_ISSUER, audience: AUD[0], expiresIn: '10m', ...opts,
  });

test('טוקן תקין: מחזיר sub, מייל באותיות קטנות, ומייל מאומת', async () => {
  const id = await verifyAppleToken(sign({}), AUD, keys);
  assert.equal(id.sub, 'apple-user-1');
  assert.equal(id.email, 'user@privaterelay.appleid.com');
  assert.equal(id.emailVerified, true);
});

test('email_verified בוליאני נקרא נכון, וחסר = לא מאומת', async () => {
  assert.equal((await verifyAppleToken(sign({ email_verified: true }), AUD, keys)).emailVerified, true);
  assert.equal((await verifyAppleToken(sign({ email_verified: undefined }), AUD, keys)).emailVerified, false);
});

test('טוקן לאפליקציה אחרת (aud) נדחה', async () => {
  await assert.rejects(verifyAppleToken(sign({}, { audience: 'com.other.app' }), AUD, keys));
});

test('מנפיק שאינו אפל נדחה', async () => {
  await assert.rejects(verifyAppleToken(sign({}, { issuer: 'https://evil.example.com' }), AUD, keys));
});

test('טוקן שפג תוקפו נדחה', async () => {
  // exp ישירות בטוקן (בלי expiresIn, שאסור לשלב איתו)
  const expired = jwt.sign(
    { sub: 'apple-user-1', email: 'u@x.com', exp: Math.floor(Date.now() / 1000) - 60 },
    privateKey,
    { algorithm: 'RS256', keyid: KID, issuer: APPLE_ISSUER, audience: AUD[0] },
  );
  await assert.rejects(verifyAppleToken(expired, AUD, keys));
});

test('חתימה במפתח אחר (זיוף) נדחית', async () => {
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  await assert.rejects(verifyAppleToken(sign({}, {}, other), AUD, keys));
});

test('kid לא מוכר: מרעננים מפתחות פעם אחת, ואם עדיין אין, נדחה', async () => {
  let refreshed = 0;
  const getKeys = async (force: boolean) => { if (force) refreshed++; return []; };
  await assert.rejects(verifyAppleToken(sign({}), AUD, getKeys));
  assert.equal(refreshed, 1);
});

test('מפתח חדש שמופיע רק אחרי רענון מתקבל', async () => {
  const getKeys = async (force: boolean) => (force ? [jwk] : []);
  const id = await verifyAppleToken(sign({}), AUD, getKeys);
  assert.equal(id.sub, 'apple-user-1');
});

test('בלי קהל מוגדר, כל טוקן נדחה', async () => {
  await assert.rejects(verifyAppleToken(sign({}), [], keys));
});
