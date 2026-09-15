/**
 * insecureAgent.ts
 *
 * סוכן HTTPS שמדלג על אימות תעודה — לשימוש ייעודי בלקוחות axios
 * שמורידים קבצים מפורטלי השקיפות שמחזירים שרשרת תעודות לא תקפה.
 *
 * המימוש הנוכחי: try-secure-first — מנסה TLS תקין תחילה, ורק אם
 * השגיאה היא שגיאת תעודה (CERT_* / ERR_TLS_*) מנסה שוב עם הסוכן
 * הלא-מאמת. כך הסוכן הלא-מאמת משמש רק כ-fallback בפועל ולא כ-ברירת
 * מחדל, ו-MITM על בקשות לפורטלים עם תעודות תקינות נחסם.
 *
 * נתוני הפורטלים (נבדק 2026-09):
 *   prices.shufersal.co.il  — DigiCert / GeoTrust, תקף
 *   prices.carrefour.co.il  — Let's Encrypt, תקף
 *   laibcatalog.co.il       — GoDaddy G2, תקף
 *   *.binaprojects.com      — Starfield G2, תקף
 * שרשרת ה-CA של Render/Node עשויה להיות חלקית — fallback ב-TLS_ERR.
 */
import { Agent as HttpsAgent } from 'https';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { logger } from '../../../config/logger';

const CERT_ERROR_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'CERT_UNTRUSTED',
  'CERT_INVALID',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_GET_ISSUER_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

const insecureHttpsAgent = new HttpsAgent({ rejectUnauthorized: false });

/**
 * axiosWithTlsFallback — wrapper ל-axios.get/post עם try-secure-first.
 * מנסה עם TLS מלא; אם נכשל בשגיאת תעודה — מנסה שוב עם הסוכן הלא-מאמת ומתעד.
 */
export async function axiosGetWithTlsFallback<T>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<import('axios').AxiosResponse<T>> {
  try {
    return await axios.get<T>(url, config);
  } catch (err: unknown) {
    const code: string =
      (err as { code?: string }).code ??
      (err as { cause?: { code?: string } }).cause?.code ?? '';
    if (!CERT_ERROR_CODES.has(code)) throw err;
    logger.warn(`[TLS fallback] שגיאת תעודה ב-${url} (${code}) — מנסה שוב ללא אימות`);
    return await axios.get<T>(url, { ...config, httpsAgent: insecureHttpsAgent });
  }
}

export async function axiosPostWithTlsFallback<T>(
  url: string,
  data?: unknown,
  config: AxiosRequestConfig = {}
): Promise<import('axios').AxiosResponse<T>> {
  try {
    return await axios.post<T>(url, data, config);
  } catch (err: unknown) {
    const code: string =
      (err as { code?: string }).code ??
      (err as { cause?: { code?: string } }).cause?.code ?? '';
    if (!CERT_ERROR_CODES.has(code)) throw err;
    logger.warn(`[TLS fallback] שגיאת תעודה ב-${url} (${code}) — מנסה שוב ללא אימות`);
    return await axios.post<T>(url, data, { ...config, httpsAgent: insecureHttpsAgent });
  }
}
