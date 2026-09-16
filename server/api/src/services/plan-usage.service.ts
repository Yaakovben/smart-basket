/**
 * plan-usage.service.ts
 *
 * מעקב שימוש יומי לפי משתמש (AI + השוואת מחירים) עבור מנוי חינמי.
 * מחושב in-memory עם איפוס חצות — אין צורך ב-Redis/DB לדיוק של כמה בקשות/יום.
 * במקרה של restart השרת האפס מתאפס — מקובל לתכונה חינמית.
 */

interface DayUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

const aiUsage = new Map<string, DayUsage>();
const priceUsage = new Map<string, DayUsage>();

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCount(map: Map<string, DayUsage>, userId: string): number {
  const entry = map.get(userId);
  if (!entry || entry.date !== todayStr()) return 0;
  return entry.count;
}

function increment(map: Map<string, DayUsage>, userId: string): number {
  const today = todayStr();
  const entry = map.get(userId);
  if (!entry || entry.date !== today) {
    map.set(userId, { date: today, count: 1 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

export const planUsage = {
  getAiCount: (userId: string) => getCount(aiUsage, userId),
  incrementAi: (userId: string) => increment(aiUsage, userId),
  getPriceCount: (userId: string) => getCount(priceUsage, userId),
  incrementPrice: (userId: string) => increment(priceUsage, userId),
};
