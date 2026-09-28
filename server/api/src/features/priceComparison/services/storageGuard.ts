/**
 * שומר מכסה: prod ו-dev יושבים באותו אשכול Atlas חינמי, עם מכסה משותפת של 512MB
 * (גודל לוגי: נתונים ואינדקסים של כל המסדים יחד). מעבר למכסה, Atlas חוסם כתיבות
 * בכל האשכול, כלומר גם בפרודקשן. לכן לפני כתיבת מחירים של רשת בודקים את הנפח
 * הכולל, ומעל הסף לא כותבים. עדיף רשת חסרה בסביבת בדיקות מאשר פרודקשן חסום.
 *
 * נמדד ב-29.9.2026: prod כ-243MB, dev כ-90MB.
 */

import mongoose from 'mongoose';
import { logger } from '../../../config/logger';

// מתחת לזה מותר לכתוב. מרווח של כ-70MB מהמכסה לסנכרון עצמו ולצמיחה של שאר האפליקציה
export const MAX_CLUSTER_USAGE_MB = 440;

const CACHE_MS = 5 * 60_000;
let cached: { at: number; mb: number } | null = null;

// הנפח הכולל של מסדי האפליקציה באשכול (MB). null = לא ניתן למדוד (הרשאות, תקלה)
export async function clusterUsageMb(): Promise<number | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.mb;
  try {
    const client = mongoose.connection.getClient();
    const { databases } = await client.db().admin().listDatabases({ nameOnly: true });
    let total = 0;
    for (const d of databases) {
      // מסדי המערכת של Atlas לא נספרים במכסה ואין הרשאה לקרוא אותם
      if (d.name === 'admin' || d.name === 'local' || d.name === 'config') continue;
      const st = await client.db(d.name).stats();
      total += (st.dataSize + st.indexSize) / 1048576;
    }
    cached = { at: Date.now(), mb: total };
    return total;
  } catch (err) {
    logger.warn(`[storage-guard] cannot measure cluster usage: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export function invalidateUsageCache(): void {
  cached = null;
}

// האם מותר לכתוב מחירים. כשאי אפשר למדוד - מותר (כמו לפני השומר), עם אזהרה בלוג
export async function storageAllowsWrite(): Promise<{ ok: boolean; usageMb: number | null }> {
  const usageMb = await clusterUsageMb();
  return { ok: usageMb === null || usageMb < MAX_CLUSTER_USAGE_MB, usageMb };
}
