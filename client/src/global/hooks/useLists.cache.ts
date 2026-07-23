// קאש של רשימות ב-localStorage לרינדור מיידי בכניסה - 7 ימים תוקף.
// ככה משתמש שחוזר רואה את הרשימות מיד בלי המתנה לרשת או סקלטון.
import type { ApiList } from "../../services/api";

const LISTS_CACHE_KEY = 'cached_lists';
const LISTS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export function readListsCache(): ApiList[] | null {
  try {
    const raw = localStorage.getItem(LISTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed._cachedAt || Date.now() - parsed._cachedAt > LISTS_CACHE_TTL) return null;
    return parsed.lists as ApiList[];
  } catch { return null; }
}

export function writeListsCache(lists: ApiList[]): void {
  try { localStorage.setItem(LISTS_CACHE_KEY, JSON.stringify({ lists, _cachedAt: Date.now() })); }
  catch { /* quota - בלעדינו */ }
}
