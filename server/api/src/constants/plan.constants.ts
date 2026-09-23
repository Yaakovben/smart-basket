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

/** בדיקה אם משתמש הוא Pro תקף — plan=pro ומנוי לא פג תוקף */
export function isPro(user: { plan?: string; planExpiresAt?: Date | null }): boolean {
  if (user.plan !== 'pro') return false;
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return false;
  return true;
}
