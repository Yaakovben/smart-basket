/**
 * safeStorage — עטיפה דקה מעל localStorage שמטפלת בשקט במצבים שבהם
 * ה-storage חסום (מצב גלישה-פרטית מסוים, quota חרג, או הרשאה נדחתה).
 *
 * מחליף את הדפוס החוזר ברחבי הקוד:
 *   try { localStorage.setItem(k, v) } catch { /* ignore *​/ }
 * ב-API נקי יותר שגם מאפשר לטפל ב-JSON ללא הזנחת שגיאות.
 */

export const safeStorage = {
  // מחזיר את הערך המאוחסן או null אם חסום/חסר
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },

  // שומר ערך. מחזיר true אם הצליח, false אם נכשל.
  set(key: string, value: string): boolean {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },

  // מוחק ערך. שקט אם localStorage חסום.
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* שקט */ }
  },

  // קורא JSON-parsed. מחזיר fallback אם הערך חסר או לא תקין.
  getJSON<T>(key: string, fallback: T): T {
    const raw = safeStorage.get(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },

  // שומר כ-JSON. מחזיר true/false כמו set.
  setJSON<T>(key: string, value: T): boolean {
    try { return safeStorage.set(key, JSON.stringify(value)); } catch { return false; }
  },
};
