import type { PriceComparisonData } from './priceComparison.types';

// מטמון לכל משתמש: 15 דקות. הנתונים משתנים רק בסנכרון (פעמיים ביום),
// אז cache ארוך חוסך עומס משמעותי על Render Free. חישוב מחדש על פתיחת
// הרשימות/מחיקת פריט נעשה דרך invalidateUser() מ-lists/products controllers,
// ככה תוצאות תמיד טריות אחרי שינוי בפועל של המשתמש.
const CACHE_TTL_MS = 15 * 60_000;
const userCache = new Map<string, { data: PriceComparisonData; expiresAt: number }>();

export function getCachedComparison(cacheKey: string): PriceComparisonData | undefined {
  const cached = userCache.get(cacheKey);
  return cached && cached.expiresAt > Date.now() ? cached.data : undefined;
}

export function setCachedComparison(cacheKey: string, data: PriceComparisonData): PriceComparisonData {
  userCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

// מנקה מטמון של משתמש ספציפי - חשוב לקרוא כשנוצר/נמחק/נקנה מוצר.
// מפתחות המטמון משתנים: 'userId', 'userId:lat,lng', 'userId:listId', 'userId:listId:lat,lng'.
// לכן צריך למחוק כל מפתח שמתחיל ב-userId (אחרת תוספת מוצר חדש ב-3 דקות
// הראשונות לא תופיע - ה-cache הקודם נשאר על השילובים האחרים של location/list).
export function invalidateUser(userId: string): void {
  const prefix = `${userId}`;
  for (const key of userCache.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      userCache.delete(key);
    }
  }
}

// מנקה את כל מטמון המשתמשים - נקרא אחרי סנכרון גלובלי כדי שכל המשתמשים
// יראו מיד את הנתונים החדשים (מחירים וסניפים) בלי להמתין 3 דק'.
export function invalidateAllUsers(): void {
  userCache.clear();
}
