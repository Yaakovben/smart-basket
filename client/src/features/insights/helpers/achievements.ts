// הישגים מחושבים בלקוח מנתונים שכבר יש (totalPurchased, currentWeeks, completionRate וכו׳).
// כל badge הוא "מטרה" שהמשתמש כבר השיג - מקור גאווה, גורם לחזור.
export type Achievement = { emoji: string; label: string; tone: string };

export const computeAchievements = (params: {
  totalPurchased: number;
  totalLists: number;
  currentWeeks: number;
  longestWeeks: number;
  completionRate: number;
  categoryCount: number;
}): Achievement[] => {
  const out: Achievement[] = [];
  if (params.totalPurchased >= 100) out.push({ emoji: '💯', label: '100 פריטים', tone: '#F59E0B' });
  else if (params.totalPurchased >= 50) out.push({ emoji: '🎯', label: '50 פריטים', tone: '#F59E0B' });
  else if (params.totalPurchased >= 10) out.push({ emoji: '✨', label: 'התחלה טובה', tone: '#14B8A6' });
  if (params.completionRate >= 90) out.push({ emoji: '🏆', label: 'מדייק', tone: '#10B981' });
  else if (params.completionRate >= 75) out.push({ emoji: '⚡', label: 'יעיל', tone: '#10B981' });
  if (params.currentWeeks >= 4) out.push({ emoji: '🔥', label: `סטריק ${params.currentWeeks} שבועות`, tone: '#EF4444' });
  else if (params.currentWeeks >= 2) out.push({ emoji: '🔥', label: `${params.currentWeeks} שבועות רצוף`, tone: '#EF4444' });
  if (params.longestWeeks >= 8 && params.longestWeeks > params.currentWeeks) out.push({ emoji: '🚀', label: `שיא ${params.longestWeeks} שבועות`, tone: '#8B5CF6' });
  if (params.categoryCount >= 8) out.push({ emoji: '🌈', label: 'מגוון מאוד', tone: '#EC4899' });
  else if (params.categoryCount >= 5) out.push({ emoji: '🎨', label: 'מגוון', tone: '#EC4899' });
  if (params.totalLists >= 5) out.push({ emoji: '📚', label: `${params.totalLists} רשימות`, tone: '#3B82F6' });
  return out;
};
