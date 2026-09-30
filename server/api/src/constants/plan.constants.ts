import { env } from '../config/environment';

// מגבלות מנוי Freemium
// free: מגבלות בסיסיות. pro: ללא הגבלה.
export const PLAN_LIMITS = {
  free: {
    maxOwnedLists: 3,        // מספר רשימות מקסימלי בבעלות המשתמש
    maxGroupMembers: 3,      // מספר חברים מקסימלי בקבוצה (כולל הבעלים)
    maxAiRequestsPerDay: 5,  // מספר בקשות AI מקסימלי ליום
    maxPriceComparisonsPerDay: 3, // מספר השוואות מחיר מקסימלי ליום
  },
} as const;

/**
 * בדיקה אם משתמש הוא Pro תקף — plan=pro ומנוי לא פג תוקף.
 * כש-FREEMIUM_ENABLED כבוי כולם נחשבים Pro, כך שאין שום מגבלה.
 */
export function isPro(user: { plan?: string; planExpiresAt?: Date | null }): boolean {
  if (!env.FREEMIUM_ENABLED) return true;
  if (user.plan !== 'pro') return false;
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return false;
  return true;
}
