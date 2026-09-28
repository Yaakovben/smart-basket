import type { Language } from '../types';

// טקסטים של פס מצב החיבור. בקובץ משלהם (כמו עמוד המנוי) כי הם שייכים רק
// לרכיב הזה. הניסוח מרגיע ומדויק: המשתמש יכול להמשיך לעבוד, שום דבר לא
// הולך לאיבוד, ומספר השינויים שממתינים הוא האמיתי מהתור במכשיר.
interface ConnectionStrings {
  offlineTitle: string;
  weakTitle: string;
  reconnecting: string;
  connecting: string;
  // אין עדיין שינויים שממתינים
  offlineCalm: string;
  weakCalm: string;
  // יש שינויים שממתינים במכשיר
  offlinePending: (n: number) => string;
  weakPending: (n: number) => string;
  syncingPending: (n: number) => string;
}

const he: ConnectionStrings = {
  offlineTitle: 'אין חיבור לאינטרנט',
  weakTitle: 'החיבור לא יציב כרגע',
  reconnecting: 'מתחבר מחדש…',
  connecting: 'מתחבר…',
  offlineCalm: 'אפשר להמשיך כרגיל. כל שינוי נשמר ויסונכרן כשהחיבור יחזור.',
  weakCalm: 'אפשר להמשיך כרגיל. כל שינוי נשמר ויסונכרן אוטומטית.',
  offlinePending: (n) => n === 1
    ? 'שינוי אחד שמור ויסונכרן כשהחיבור יחזור'
    : `${n} שינויים שמורים ויסונכרנו כשהחיבור יחזור`,
  weakPending: (n) => n === 1
    ? 'שינוי אחד שמור ויסונכרן ברגע שהחיבור יתייצב'
    : `${n} שינויים שמורים ויסונכרנו ברגע שהחיבור יתייצב`,
  syncingPending: (n) => n === 1 ? 'שינוי אחד ממתין לסנכרון' : `${n} שינויים ממתינים לסנכרון`,
};

const en: ConnectionStrings = {
  offlineTitle: 'No internet connection',
  weakTitle: 'Your connection is unstable',
  reconnecting: 'Reconnecting…',
  connecting: 'Connecting…',
  offlineCalm: 'Keep going as usual. Every change is saved and will sync when you are back online.',
  weakCalm: 'Keep going as usual. Every change is saved and syncs automatically.',
  offlinePending: (n) => n === 1
    ? '1 change saved, it will sync when you are back online'
    : `${n} changes saved, they will sync when you are back online`,
  weakPending: (n) => n === 1
    ? '1 change saved, it will sync as soon as the connection stabilizes'
    : `${n} changes saved, they will sync as soon as the connection stabilizes`,
  syncingPending: (n) => n === 1 ? '1 change waiting to sync' : `${n} changes waiting to sync`,
};

// ברוסית צורת הרבים תלויה במספר, לכן המספר מופיע בסוף ("Сохранено изменений: 3")
const ru: ConnectionStrings = {
  offlineTitle: 'Нет подключения к интернету',
  weakTitle: 'Соединение нестабильно',
  reconnecting: 'Переподключение…',
  connecting: 'Подключение…',
  offlineCalm: 'Можно продолжать как обычно. Все изменения сохраняются и синхронизируются, когда связь вернётся.',
  weakCalm: 'Можно продолжать как обычно. Все изменения сохраняются и синхронизируются автоматически.',
  offlinePending: (n) => `Сохранено изменений: ${n}. Синхронизируем, когда связь вернётся`,
  weakPending: (n) => `Сохранено изменений: ${n}. Синхронизируем, как только соединение стабилизируется`,
  syncingPending: (n) => `Ожидают синхронизации: ${n}`,
};

const DICTS: Record<Language, ConnectionStrings> = { he, en, ru };

export const getConnectionStrings = (lang: Language): ConnectionStrings => DICTS[lang] ?? he;
