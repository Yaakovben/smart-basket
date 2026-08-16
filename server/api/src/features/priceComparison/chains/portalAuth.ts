/**
 * portalAuth.ts
 *
 * שכבת האימות/session מול פורטל url.publishedprices.co.il (Cerberus login).
 * אחראית על: יצירת client עם cookie jar, זיהוי כשל התחברות, ניסיון כמה
 * usernames שונים, ו-retry כללי לשגיאות רשת זמניות.
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { HttpsCookieAgent } from 'http-cookie-agent/http';
import { logger } from '../../../config/logger';

export const PORTAL_BASE = 'https://url.publishedprices.co.il';

// חילוץ csrftoken מ-meta של Cerberus
function extractCsrf(html: string): string {
  const m = html.match(/name=['"]csrftoken['"]\s+content=['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}

async function createAuthenticatedClient(username: string, password: string): Promise<{ client: AxiosInstance; csrftoken: string }> {
  // jar עם looseMode סובלני ל-Set-Cookie לא-סטנדרטיים שמחזיר הפורטל
  const jar = new CookieJar(undefined, { looseMode: true, allowSpecialUseDomain: true });
  // סוכן יחיד שמשלב cookie management + TLS bypass. אסור להעביר httpsAgent
  // ל-axios יחד עם wrapper (זורק שגיאה) - הסוכן הזה תופס את שניהם.
  // HttpsCookieAgent (מ-http-cookie-agent) משלב cookie jar + TLS options ביחד,
  // כדי להעביר rejectUnauthorized=false (הפורטל מחזיר שרשרת תעודות חלקית).
  const httpsAgent = new HttpsCookieAgent({
    cookies: { jar },
    rejectUnauthorized: false,
  });
  const client = axios.create({
    baseURL: PORTAL_BASE,
    timeout: 60_000,
    httpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
  });

  // צעד 1: GET /login — session cookie + csrftoken
  const loginPage = await client.get<string>('/login');
  const initialCsrf = extractCsrf(loginPage.data);

  // צעד 2: POST /login/user — התחברות
  const form = new URLSearchParams();
  form.append('r', '');
  form.append('username', username);
  form.append('password', password);
  form.append('Submit', 'Sign in');
  form.append('csrftoken', initialCsrf);

  await client.post('/login/user', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${PORTAL_BASE}/login`,
      Origin: PORTAL_BASE,
      'X-CSRFToken': initialCsrf,
    },
    maxRedirects: 5,
  });

  // צעד 3: GET /file — csrftoken חדש לבקשות dir/download
  const filePage = await client.get<string>('/file');
  // זיהוי כשל התחברות: אם /file עדיין מחזיר את טופס ההתחברות (לדוגמה
  // username/password input), המשמעות שהקרדנשלים נדחו. זורקים שגיאה
  // מפורשת כדי שה-fallback יוכל לנסות username אחר במקום להמשיך
  // עם session ריק שיחזיר 0 קבצים.
  if (/name=['"]username['"]/i.test(filePage.data) && /name=['"]password['"]/i.test(filePage.data)) {
    throw new Error(`auth_failed_for_user:${username}`);
  }
  const sessionCsrf = extractCsrf(filePage.data);
  return { client, csrftoken: sessionCsrf };
}

// יוצר את שני ה-variants של username שכדאי לנסות (case toggle).
// מקרים אמיתיים בפורטל: 'Victory' לעומת 'victory', 'TivTaam' לעומת 'tivtaam'.
function usernameVariants(username: string): string[] {
  const lower = username.toLowerCase();
  return username === lower ? [username] : [username, lower];
}

// מרחיב מערך של מועמדי-usernames לכל ה-variants האפשריים (case toggle על כל אחד),
// בלי כפילויות. שימושי כשלא ידוע ה-username המדויק של רשת בפורטל.
function expandUsernameCandidates(usernames: string | string[]): string[] {
  const usernameList = Array.isArray(usernames) ? usernames : [usernames];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of usernameList) {
    for (const v of usernameVariants(u)) {
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
  }
  return out;
}

// מנסה התחברות עם כל מועמדי ה-usernames בסדר עד שאחד מצליח. זורק את השגיאה
// האחרונה אם כולם נכשלו. שימושי כשלא ידוע ה-username המדויק של רשת.
export async function tryAuthenticateWithCandidates(
  chainId: string,
  usernames: string | string[],
  password: string
): Promise<{ client: AxiosInstance; csrftoken: string }> {
  const candidates = expandUsernameCandidates(usernames);
  let lastErr: unknown;
  for (const u of candidates) {
    try {
      return await createAuthenticatedClient(u, password);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : 'unknown';
      if (!msg.startsWith('auth_failed_for_user:')) throw err; // שגיאת רשת/timeout - לא לנסות שוב
      logger.warn(`[chain:${chainId}] auth failed for username='${u}', trying next candidate`);
    }
  }
  throw lastErr;
}

// מזהה שגיאות רשת שניתן לנסות שוב עליהן (DNS, timeout, reset).
// שגיאות 4xx/5xx או parse errors - לא מנסים שוב.
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message || '';
  const code = (err as { code?: string }).code || '';
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|getaddrinfo|socket hang up|network/i.test(msg)
    || /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(code);
}

// עוטף פונקציה ב-retry עם backoff exponential.
// משמש לקריאות שרת שעשויות ליפול על DNS זמני.
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || i === attempts - 1) throw err;
      // backoff: 1.5s, 3s, 6s...
      const delay = 1500 * Math.pow(2, i);
      await new Promise<void>(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
