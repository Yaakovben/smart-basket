import { env } from '../config';
import { AuthError } from '../errors';
import { verifyAppleToken, type AppleIdentity, type AppleJwk } from './appleTokenVerify';

// ===== Sign in with Apple =====
// האפליקציה ב-iOS מקבלת מאפל identity token (JWT). האימות עצמו ב-
// appleTokenVerify; כאן רק המפתחות של אפל (עם מטמון) והקהל מההגדרות.

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
// אפל מחליפה מפתחות לעיתים רחוקות; שעה במטמון חוסכת בקשה בכל כניסה
const KEYS_TTL_MS = 60 * 60 * 1000;

let keysCache: { at: number; keys: AppleJwk[] } | null = null;

async function appleKeys(forceRefresh: boolean): Promise<AppleJwk[]> {
  if (!forceRefresh && keysCache && Date.now() - keysCache.at < KEYS_TTL_MS) return keysCache.keys;
  const res = await fetch(APPLE_KEYS_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw AuthError.appleAuthFailed();
  const body = (await res.json()) as { keys?: AppleJwk[] };
  keysCache = { at: Date.now(), keys: body.keys ?? [] };
  return keysCache.keys;
}

export function verifyAppleIdentityToken(idToken: string): Promise<AppleIdentity> {
  const audiences = env.APPLE_CLIENT_IDS.split(',').map(s => s.trim()).filter(Boolean);
  return verifyAppleToken(idToken, audiences, appleKeys);
}
