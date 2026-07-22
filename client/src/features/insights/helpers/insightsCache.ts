import { safeStorage } from '../../../global/helpers';

// Cache מקומי - מאפשר הצגה מיידית של תובנות בזמן שהשרת מחשב.
// תוקף: 24 שעות (הנתונים לא משתנים הרבה בין פתיחות).
export const INSIGHTS_CACHE_KEY = 'sb_insights_cache_v1';
export const PRICE_CACHE_KEY = 'sb_price_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedEnvelope<T> { data: T; at: number }

export const readCache = <T,>(key: string): T | null => {
  const c = safeStorage.getJSON<CachedEnvelope<T> | null>(key, null);
  if (!c || typeof c !== 'object' || !c.at) return null;
  if (Date.now() - c.at > CACHE_TTL_MS) return null;
  return c.data;
};

export const writeCache = <T,>(key: string, data: T): void => {
  safeStorage.setJSON(key, { data, at: Date.now() });
};
