import jwt from 'jsonwebtoken';
import { env } from '../../config/environment';
import { logger } from '../../config';
import { buildFcmMessage, decodeSecret, isDeadFcmToken, type NativePushMessage } from './nativePushPayload';

// ===== Firebase Cloud Messaging (אנדרואיד) =====
// שליחה דרך FCM HTTP v1, בלי ה-SDK הכבד של firebase-admin: חותמים JWT עם
// מפתח ה-Service Account, מחליפים אותו ב-access token של גוגל (שעה), ושולחים.

interface ServiceAccount { project_id: string; client_email: string; private_key: string; token_uri?: string }

let account: ServiceAccount | null | undefined;
let accessToken: { value: string; expiresAt: number } | null = null;

function getAccount(): ServiceAccount | null {
  if (account !== undefined) return account;
  account = null;
  const raw = decodeSecret(env.FCM_SERVICE_ACCOUNT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      account = { ...parsed, private_key: parsed.private_key.replace(/\\n/g, '\n') };
    } else {
      logger.warn('FCM_SERVICE_ACCOUNT is missing project_id/client_email/private_key');
    }
  } catch {
    logger.warn('FCM_SERVICE_ACCOUNT is not valid JSON');
  }
  return account;
}

export const isFcmEnabled = (): boolean => !!getAccount();

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (accessToken && Date.now() < accessToken.expiresAt) return accessToken.value;
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: tokenUri, iat: now, exp: now + 3600 },
    sa.private_key,
    { algorithm: 'RS256' },
  );
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in?: number };
  // מרווח ביטחון של 5 דקות לפני התפוגה
  accessToken = { value: body.access_token, expiresAt: Date.now() + ((body.expires_in ?? 3600) - 300) * 1000 };
  return accessToken.value;
}

export type SendOutcome = 'ok' | 'dead' | 'error';

export async function sendFcm(token: string, msg: NativePushMessage): Promise<SendOutcome> {
  const sa = getAccount();
  if (!sa) return 'error';
  try {
    const bearer = await getAccessToken(sa);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildFcmMessage(token, msg)),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return 'ok';
    const text = await res.text().catch(() => '');
    if (res.status === 401) accessToken = null; // ננסה טוקן חדש בפעם הבאה
    if (isDeadFcmToken(res.status, text)) return 'dead';
    logger.warn('FCM send failed %d: %s', res.status, text.slice(0, 300));
    return 'error';
  } catch (err) {
    logger.warn('FCM send error: %s', (err as Error).message);
    return 'error';
  }
}
