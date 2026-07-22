import type { TranslationKeys } from '../../../global/i18n/translations';

// ===== ברכה לפי שעה =====
export const getTimeGreeting = (): TranslationKeys => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'goodMorning';
  if (hour >= 12 && hour < 17) return 'goodAfternoon';
  if (hour >= 17 && hour < 22) return 'goodEvening';
  return 'goodNight';
};

// ===== אימוג'י לפי שעה - מוסיף אישיות קטנה לכותרת =====
export const getTimeEmoji = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return '🌅';   // זריחה
  if (hour >= 8 && hour < 12) return '☀️';   // בוקר
  if (hour >= 12 && hour < 17) return '🌤️'; // צהריים
  if (hour >= 17 && hour < 20) return '🌆'; // ערב
  if (hour >= 20 && hour < 22) return '🌃'; // לילה מוקדם
  return '🌙';                              // לילה
};

// ===== מסר משני קטן ליום בשבוע =====
export const getWeekdayMessage = (t: (k: TranslationKeys) => string): string | null => {
  const day = new Date().getDay(); // 0=ראשון, 5=שישי, 6=שבת
  const hour = new Date().getHours();
  // יום שישי בבוקר/צהריים - "מתכוננים לשבת?"
  if (day === 5 && hour >= 6 && hour < 16) return 'מתכוננים לשבת? 🕯️';
  // מוצ"ש - "סוף שבוע 🎉"
  if (day === 6 && hour >= 19) return 'שבוע חדש 💪';
  // ראשון בבוקר - התחלה חדשה
  if (day === 0 && hour >= 6 && hour < 12) return 'שבוע חדש מתחיל 🚀';
  return null;
  // הפניה ל-t להתאמה עתידית לתרגום (כרגע לא בשימוש)
  void t;
};
