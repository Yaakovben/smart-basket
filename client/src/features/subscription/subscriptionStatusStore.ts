import { subscriptionApi, type SubscriptionStatus } from '../../services/api/subscription.api';

// מצב המנוי נטען ממקום אחד לכל האפליקציה: עמוד המנוי, התג בהגדרות, הבאנר
// בבית, חלון השדרוג ומגבלת הרשימות. קודם כל אחד מהם שלח בקשה משלו בכל
// פתיחה, והתג בהגדרות הופיע רק אחרי שהבקשה חזרה. עכשיו:
//  1. מה שכבר נטען מוצג מיד (גם אחרי רענון דף, מהאחסון המקומי)
//  2. בקשות מקבילות מתאחדות לבקשה אחת
//  3. אחרי רכישה או שינוי קוראים ל־invalidate והכל מתעדכן

const STORAGE_KEY = 'sb_subscription_status';
// אחרי הזמן הזה הנתון עדיין מוצג, אבל נטען מחדש ברקע
const FRESH_MS = 60_000;

let cached: { at: number; status: SubscriptionStatus } | null = readStored();
let inFlight: Promise<SubscriptionStatus> | null = null;
const listeners = new Set<(status: SubscriptionStatus) => void>();

function readStored(): { at: number; status: SubscriptionStatus } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; status: SubscriptionStatus };
    // נתון מאחסון הוא לתצוגה מיידית בלבד, תמיד נטען מחדש
    return parsed?.status ? { at: 0, status: parsed.status } : null;
  } catch {
    return null;
  }
}

function store(status: SubscriptionStatus) {
  cached = { at: Date.now(), status };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cached)); } catch { /* לא קריטי */ }
  listeners.forEach((l) => l(status));
}

// הנתון האחרון שידוע, בלי בקשה. null אם עוד לא נטען אף פעם.
export const peekSubscriptionStatus = (): SubscriptionStatus | null => cached?.status ?? null;

// מחזיר נתון טרי אם יש, אחרת טוען (בקשה אחת גם אם כמה מבקשים בו זמנית).
export function loadSubscriptionStatus(force = false): Promise<SubscriptionStatus> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.status);
  if (inFlight) return inFlight;
  inFlight = subscriptionApi.getStatus()
    .then((status) => { store(status); return status; })
    .finally(() => { inFlight = null; });
  return inFlight;
}

// אחרי פעולה שמשנה את המנוי (רכישה, שחזור, יציאה מהחשבון)
export function invalidateSubscriptionStatus(): void {
  if (cached) cached = { ...cached, at: 0 };
}

export function clearSubscriptionStatus(): void {
  cached = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* לא קריטי */ }
}

export function subscribeSubscriptionStatus(cb: (status: SubscriptionStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
