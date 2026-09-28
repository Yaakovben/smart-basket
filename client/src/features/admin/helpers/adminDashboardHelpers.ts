// מוסיף את המשתמש הנוכחי לרשימת המחוברים - למקרה שהסוקט עוד לא הספיק לעדכן אותו.
export const mergeOnlineWithSelf = (onlineIds: Set<string>, userId?: string): Set<string> => {
  if (!userId) return onlineIds;
  if (onlineIds.has(userId)) return onlineIds;
  const merged = new Set(onlineIds);
  merged.add(userId);
  return merged;
};

// ===== מצב מנוי אמיתי =====
// השדה plan בשרת נשאר 'pro' גם אחרי שהתוקף עבר (השרת בודק תוקף בכל בקשה).
// בדף המנהל מציגים רק את המצב האמיתי: Pro שתוקפו עבר הוא חינמי.
interface PlanFields {
  plan?: 'free' | 'pro';
  planExpiresAt?: string | null;
  planSource?: 'trial' | 'paid' | 'store';
}

const DAY_MS = 86_400_000;

export const isEffectivePro = (u: PlanFields): boolean =>
  u.plan === 'pro' && (!u.planExpiresAt || new Date(u.planExpiresAt).getTime() > Date.now());

// סוג המנוי הפעיל, או null כשאין Pro
export type ProKind = 'store' | 'trial' | 'granted' | 'permanent';

export const proKindOf = (u: PlanFields): ProKind | null => {
  if (!isEffectivePro(u)) return null;
  if (!u.planExpiresAt) return 'permanent';
  if (u.planSource === 'store') return 'store';
  if (u.planSource === 'trial') return 'trial';
  return 'granted';
};

// ימים שנותרו עד סוף המנוי (עיגול למעלה), null למנוי קבוע או כשאין Pro
export const proDaysLeft = (u: PlanFields): number | null =>
  isEffectivePro(u) && u.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(u.planExpiresAt).getTime() - Date.now()) / DAY_MS))
    : null;
