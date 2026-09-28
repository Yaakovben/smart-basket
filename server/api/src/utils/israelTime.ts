// זמן ישראל: השרת רץ ב־UTC, ולכן new Date(y, m, d) שלו מתחיל את היום ב־03:00
// (או 02:00 בחורף) לפי שעון ישראל. כאן מחשבים את חצות האמיתית בישראל.
const TIME_ZONE = 'Asia/Jerusalem';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, hourCycle: 'h23',
  year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});

const israelParts = (at: Date) => {
  const p = Object.fromEntries(partsFormatter.formatToParts(at).map(x => [x.type, Number(x.value)]));
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
};

// ההפרש בין שעון ישראל ל־UTC ברגע נתון (שעתיים או שלוש)
const israelOffsetMs = (at: Date): number => {
  const p = israelParts(at);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
};

// חצות בישראל של תאריך קלנדרי נתון. מעבר שעון בישראל קורה ב־02:00, ולכן
// מודדים את ההפרש שעתיים לפני חצות UTC, שזה 00:00 או 01:00 בישראל, עוד לפני המעבר.
const israelMidnight = (year: number, month: number, day: number): Date => {
  const utcMidnight = Date.UTC(year, month - 1, day);
  return new Date(utcMidnight - israelOffsetMs(new Date(utcMidnight - 2 * 3_600_000)));
};

// תחילת היום הנוכחי בישראל (00:00)
export const israelDayStart = (now: Date = new Date()): Date => {
  const p = israelParts(now);
  return israelMidnight(p.year, p.month, p.day);
};

// תחילת החודש הנוכחי בישראל (הראשון לחודש, 00:00)
export const israelMonthStart = (now: Date = new Date()): Date => {
  const p = israelParts(now);
  return israelMidnight(p.year, p.month, 1);
};
