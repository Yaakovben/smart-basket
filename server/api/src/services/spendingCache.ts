import type { SpendingData } from './spending.service';

// מטמון לכל משתמש: 30 דקות, אותו דפוס בדיוק כמו comparisonCache.ts של
// price-comparison. computeSpending() מתאים כל שם מוצר שנקנה מול מאגר
// המחירים הממשלתי (regex-scan לא זול), אז חישוב חוזר בכל טעינת תובנות -
// כולל מעבר בין טאבים באותו ביקור - היה מיותר וכבד. invalidateUser נקרא
// מ-product.service.ts בכל שינוי מוצר (הוספה/עדכון/מחיקה/סימון קנייה),
// באותן נקודות בדיוק שכבר קוראות ל-invalidatePriceCacheForUser.
const CACHE_TTL_MS = 30 * 60_000;
const userCache = new Map<string, { data: SpendingData; expiresAt: number }>();

export function getCachedSpending(userId: string): SpendingData | undefined {
  const cached = userCache.get(userId);
  return cached && cached.expiresAt > Date.now() ? cached.data : undefined;
}

export function setCachedSpending(userId: string, data: SpendingData): SpendingData {
  userCache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function invalidateUser(userId: string): void {
  userCache.delete(userId);
}
