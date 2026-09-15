import { debugLog } from './debug-log';

const ACCESS_TOKEN_KEY = 'accessToken';

// ===== גיבוי access token ב-IndexedDB =====
// iOS Safari ITP מנקה localStorage אחרי 7 ימי חוסר פעילות, אך IndexedDB שורד.
// refresh token עבר ל-httpOnly cookie (לא נגיש ל-JS) - לכן מגבים כאן רק את ה-access token.
const IDB_NAME = 'sb_auth';
const IDB_STORE = 'tokens';

function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idbSet(key: string, value: string) {
  const db = await idbOpen();
  if (!db) return;
  try { db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key); } catch { /* ignore */ }
}

async function idbGet(key: string): Promise<string | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idbDelete(key: string) {
  const db = await idbOpen();
  if (!db) return;
  try { db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key); } catch { /* ignore */ }
}

// שחזור מ-IDB אם localStorage נמחק (למשל iOS Safari ITP)
export const rehydrateTokensFromIdb = async (): Promise<boolean> => {
  if (localStorage.getItem(ACCESS_TOKEN_KEY)) return true;
  const access = await idbGet(ACCESS_TOKEN_KEY);
  if (access) {
    try { localStorage.setItem(ACCESS_TOKEN_KEY, access); } catch { /* ignore */ }
    return true;
  }
  return false;
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

// getRefreshToken מוחזר null תמיד — ה-refresh token נמצא ב-httpOnly cookie.
// הפונקציה נשמרת לתאימות אחורה עם קוד שעדיין מייבא אותה.
export const getRefreshToken = (): string | null => null;

export const setTokens = (accessToken: string, _refreshToken?: string) => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } catch {
    debugLog('Failed to save access token to localStorage', undefined, true);
  }
  void idbSet(ACCESS_TOKEN_KEY, accessToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  void idbDelete(ACCESS_TOKEN_KEY);
};
