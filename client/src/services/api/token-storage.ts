import { debugLog } from './debug-log';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// ===== גיבוי טוקנים ב-IndexedDB =====
// iOS Safari ITP מנקה localStorage אחרי 7 ימי חוסר פעילות, אך IndexedDB שורד
// כותבים בכפילות, ומשחזרים מ-IDB אם localStorage התרוקן
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
  if (localStorage.getItem(ACCESS_TOKEN_KEY) && localStorage.getItem(REFRESH_TOKEN_KEY)) return true;
  const [access, refresh] = await Promise.all([idbGet(ACCESS_TOKEN_KEY), idbGet(REFRESH_TOKEN_KEY)]);
  if (access && refresh) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    } catch { /* ignore */ }
    return true;
  }
  return false;
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken: string, refreshToken: string) => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // localStorage מלא או לא זמין, למשל גלישה פרטית
    debugLog('Failed to save tokens to localStorage', undefined, true);
  }
  // גיבוי מקביל ל-IDB כדי לשרוד מחיקת localStorage על ידי ITP
  void idbSet(ACCESS_TOKEN_KEY, accessToken);
  void idbSet(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  void idbDelete(ACCESS_TOKEN_KEY);
  void idbDelete(REFRESH_TOKEN_KEY);
};
