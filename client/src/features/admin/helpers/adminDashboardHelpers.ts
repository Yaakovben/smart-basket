// מוסיף את המשתמש הנוכחי לרשימת המחוברים - למקרה שהסוקט עוד לא הספיק לעדכן אותו.
export const mergeOnlineWithSelf = (onlineIds: Set<string>, userId?: string): Set<string> => {
  if (!userId) return onlineIds;
  if (onlineIds.has(userId)) return onlineIds;
  const merged = new Set(onlineIds);
  merged.add(userId);
  return merged;
};
