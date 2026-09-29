/**
 * איחוד רשימת הקבצים של היום עם הרשימה השמורה, לפורטלים שמציגים רק את קובצי היום.
 * ראו models/PortalFileCache.model.ts.
 */

import { PortalFileCache } from '../models/PortalFileCache.model';
import { logger } from '../../../config/logger';

// רשומה שמורה ישנה מזה לא משמשת: עדיף סניף בלי מחיר מאשר מחיר ישן בלי אזהרה
export const MAX_CACHED_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * מאחד את הרשומות של היום עם השמורות (בלי כפילויות לפי keyOf), שומר את האיחוד
 * ומחזיר אותו. dateOf = מתי פורסם הקובץ, לסינון רשומות ישנות. כשל במסד לא מפיל
 * את הסנכרון: חוזרים לרשימת היום בלבד.
 */
export async function mergeWithCachedListing<T extends object>(
  chainId: string,
  today: T[],
  keyOf: (e: T) => string,
  dateOf: (e: T) => Date | null,
  now = new Date(),
): Promise<T[]> {
  try {
    const doc = await PortalFileCache.findOne({ chainId }).lean();
    const cached = ((doc?.entries ?? []) as unknown as T[]).filter(e => {
      const d = dateOf(e);
      return d !== null && now.getTime() - d.getTime() <= MAX_CACHED_AGE_MS;
    });
    const merged = mergeListings(today, cached, keyOf);
    await PortalFileCache.updateOne({ chainId }, { $set: { entries: merged } }, { upsert: true });
    if (merged.length > today.length) {
      logger.info(`[portal-cache] ${chainId}: today ${today.length} files, using ${merged.length} with cached listing`);
    }
    return merged;
  } catch (err) {
    logger.warn(`[portal-cache] ${chainId}: cache unavailable, using today's listing only: ${err instanceof Error ? err.message : err}`);
    return today;
  }
}

// איחוד בלי כפילויות: רשומה של היום גוברת על שמורה עם אותו מפתח. טהור, לבדיקות
export function mergeListings<T>(today: T[], cached: T[], keyOf: (e: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const e of cached) byKey.set(keyOf(e), e);
  for (const e of today) byKey.set(keyOf(e), e);
  return [...byKey.values()];
}
