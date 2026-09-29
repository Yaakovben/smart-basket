import http2 from 'http2';
import jwt from 'jsonwebtoken';
import { env } from '../../config/environment';
import { logger } from '../../config';
import { buildApnsPayload, decodeSecret, isDeadApnsToken, type NativePushMessage } from './nativePushPayload';
import type { SendOutcome } from './fcm.sender';

// ===== APNs (iOS) =====
// שליחה ישירות לשרתי אפל ב-HTTP/2 עם מפתח .p8 (בלי Firebase ב-iOS).
// טוקן החתימה (JWT ES256) תקף עד שעה ואפל מבקשת לא לחדש אותו יותר מדי,
// לכן הוא נשמר 50 דקות. החיבור נשמר פתוח ומשמש את כל השליחות.

const PROD_HOST = 'https://api.push.apple.com';
const SANDBOX_HOST = 'https://api.sandbox.push.apple.com';

let providerToken: { value: string; createdAt: number } | null = null;
const sessions = new Map<string, http2.ClientHttp2Session>();

export const isApnsEnabled = (): boolean => !!(env.APNS_KEY && env.APNS_KEY_ID && env.APNS_TEAM_ID);

function getProviderToken(): string {
  if (providerToken && Date.now() - providerToken.createdAt < 50 * 60 * 1000) return providerToken.value;
  const value = jwt.sign({ iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, decodeSecret(env.APNS_KEY), {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: env.APNS_KEY_ID },
  });
  providerToken = { value, createdAt: Date.now() };
  return value;
}

function getSession(host: string): http2.ClientHttp2Session {
  const existing = sessions.get(host);
  if (existing && !existing.closed && !existing.destroyed) return existing;
  const session = http2.connect(host);
  session.on('error', (err) => { logger.warn('APNs session error: %s', err.message); sessions.delete(host); });
  session.on('close', () => sessions.delete(host));
  // שלא יחזיק את התהליך בחיים כשאין שליחות
  session.unref();
  sessions.set(host, session);
  return session;
}

function sendOnce(host: string, deviceToken: string, body: string): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve) => {
    let session: http2.ClientHttp2Session;
    try { session = getSession(host); } catch (err) {
      resolve({ status: 0, reason: (err as Error).message }); return;
    }
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${getProviderToken()}`,
      'apns-topic': env.APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
      'content-type': 'application/json',
    });
    let status = 0;
    let data = '';
    req.setTimeout(10000, () => { req.close(); resolve({ status: 0, reason: 'timeout' }); });
    req.on('response', (headers) => { status = Number(headers[':status'] ?? 0); });
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; });
    req.on('end', () => {
      let reason: string | undefined;
      try { reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined; } catch { /* גוף ריק */ }
      resolve({ status, reason });
    });
    req.on('error', (err) => resolve({ status: 0, reason: err.message }));
    req.end(body);
  });
}

export async function sendApns(deviceToken: string, msg: NativePushMessage): Promise<SendOutcome> {
  if (!isApnsEnabled()) return 'error';
  const body = JSON.stringify(buildApnsPayload(msg));
  const primary = env.APNS_USE_SANDBOX ? SANDBOX_HOST : PROD_HOST;
  try {
    let res = await sendOnce(primary, deviceToken, body);
    // טוקן מבנייה של Xcode מול שרת ה-production (או להפך): מנסים פעם אחת את
    // הסביבה השנייה לפני שמחליטים שהטוקן מת, כדי לא למחוק טוקן תקין
    if (res.reason === 'BadDeviceToken') {
      res = await sendOnce(primary === PROD_HOST ? SANDBOX_HOST : PROD_HOST, deviceToken, body);
    }
    if (res.status === 200) return 'ok';
    if (res.status === 403 && res.reason === 'ExpiredProviderToken') providerToken = null;
    if (isDeadApnsToken(res.status, res.reason)) return 'dead';
    logger.warn('APNs send failed %d: %s', res.status, res.reason ?? '');
    return 'error';
  } catch (err) {
    logger.warn('APNs send error: %s', (err as Error).message);
    return 'error';
  }
}
