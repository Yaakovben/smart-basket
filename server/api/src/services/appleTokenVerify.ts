import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthError } from '../errors';

// אימות identity token של Sign in with Apple, בלי תלות בהגדרות השרת (נבדק
// בבדיקות יחידה). חתימה במפתח הציבורי של אפל לפי kid, מנפיק אפל, קהל שהוא
// האפליקציה שלנו, ותוקף. המפתחות מגיעים מבחוץ (getKeys) כדי שיהיה אפשר
// לרענן אותם, למטמן אותם, ולבדוק בלי רשת.

export const APPLE_ISSUER = 'https://appleid.apple.com';

export interface AppleJwk { kid: string; kty: string; alg?: string; use?: string; n: string; e: string }

export interface AppleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

export async function verifyAppleToken(
  idToken: string,
  audiences: string[],
  getKeys: (forceRefresh: boolean) => Promise<AppleJwk[]>,
): Promise<AppleIdentity> {
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded && typeof decoded === 'object' ? decoded.header.kid : undefined;
  if (!kid || audiences.length === 0) throw AuthError.appleAuthFailed();

  // מפתח שלא נמצא: אולי אפל הוסיפה מפתח חדש, מרעננים פעם אחת
  let jwk = (await getKeys(false)).find(k => k.kid === kid);
  if (!jwk) jwk = (await getKeys(true)).find(k => k.kid === kid);
  if (!jwk) throw AuthError.appleAuthFailed();

  const publicKey = crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKey, format: 'jwk' });

  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      audience: audiences as [string, ...string[]],
    }) as jwt.JwtPayload;
  } catch {
    throw AuthError.appleAuthFailed();
  }

  if (!claims.sub) throw AuthError.appleAuthFailed();
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : null;
  // אפל שולחת email_verified כמחרוזת "true" או כבוליאני
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  return { sub: claims.sub, email, emailVerified };
}
