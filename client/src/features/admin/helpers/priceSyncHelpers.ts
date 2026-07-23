// חישובים טהורים למסך ניהול מאגר המחירים - פורמט זמן ותרגום שגיאות.

// פורמט גיל סנכרון - מציג זמן יחסי קצר + שעה אבסולוטית, כדי שאדמין
// יבין במבט אחד "מתי בדיוק" קרה הסנכרון, לא רק "לפני כמה זמן".
export const formatAge = (hours: number | null, completedAt?: string | null): string => {
  if (hours === null) return 'לא ידוע';
  const relative = hours < 1
    ? `לפני ${Math.round(hours * 60)} דק'`
    : hours < 24
      ? `לפני ${hours.toFixed(1)} שעות`
      : `לפני ${Math.floor(hours / 24)} ימים`;
  if (!completedAt) return relative;
  const d = new Date(completedAt);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const date = sameDay ? 'היום' : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  return `${relative} · ${date} ${time}`;
};

// תרגום קודי שגיאה טכניים לעברית
export const humanizeError = (raw: string): { msg: string; severity: 'soft' | 'hard' } => {
  if (/no_price_file_found/i.test(raw)) return { msg: 'הרשת לא פרסמה מחירים היום', severity: 'soft' };
  if (/no_stores_file_found/i.test(raw)) return { msg: 'הרשת לא פרסמה קובץ סניפים', severity: 'soft' };
  if (/no_stores_in_file/i.test(raw)) return { msg: 'קובץ הסניפים ריק', severity: 'soft' };
  if (/adapter_has_no_stores_support/i.test(raw)) return { msg: 'אין תמיכה בסניפים', severity: 'soft' };
  if (/401|unauthorized|login|invalid.*user/i.test(raw)) return { msg: 'משתמש/סיסמה לא תקפים', severity: 'hard' };
  if (/timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) return { msg: 'תקלת רשת זמנית', severity: 'soft' };
  if (/rate.?limit|too.?many/i.test(raw)) return { msg: 'חריגת קצב', severity: 'soft' };
  return { msg: raw.substring(0, 60), severity: 'hard' };
};
