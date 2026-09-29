// ניסוח תזכורות סיום ה-Pro במתנה. בקובץ נפרד בלי תלות בהגדרות השרת, כדי
// שאפשר יהיה לבדוק אותו בבדיקות יחידה.
const DAY_MS = 24 * 60 * 60 * 1000;

// ימים שנותרו, מעוגל למעלה: 30 שעות הן "עוד יומיים", לא "עוד יום"
export function daysLeft(expiresAt: Date, now: Date): number {
  return Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
}

export function reminderTitle(days: number): string {
  if (days === 1) return '⏳ ה-Pro במתנה מסתיים מחר';
  if (days === 2) return '⏳ ה-Pro במתנה מסתיים בעוד יומיים';
  return `⏳ ה-Pro במתנה מסתיים בעוד ${days} ימים`;
}
