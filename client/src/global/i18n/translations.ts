import type { Language } from '../types';
import type { Translations } from './translations/types';
import { he } from './translations/he';

export type { TranslationKeys, Translations } from './translations/types';

// עברית נטענת סטטית (ברירת המחדל/השפה הנפוצה ביותר) - אנגלית ורוסית
// נטענות בטעינה עצלה (dynamic import) רק כשהמשתמש בפועל בוחר בהן, כדי
// לא לנפח את ה-bundle הראשי בשתי שפות שרוב המשתמשים לא צריכים.

// מטמון ברמת המודול (לא React state) - מתמלא בפעם הראשונה שנטענת שפה
// לא-עברית. מאפשר גם גישה סינכרונית (getTranslationsSync) למקומות שלא
// יכולים לחכות ל-Promise, כמו ErrorBoundary (class component שיכול
// לתפוס שגיאה עוד לפני שה-SettingsProvider עלה).
const cache: Partial<Record<Language, Translations>> = { he };

export const loadTranslations = async (language: Language): Promise<Translations> => {
  const cached = cache[language];
  if (cached) return cached;
  const loaded = language === 'en'
    ? (await import('./translations/en')).en
    : language === 'ru'
      ? (await import('./translations/ru')).ru
      : he;
  cache[language] = loaded;
  return loaded;
};

// גישה סינכרונית - נופלת לעברית אם השפה המבוקשת עדיין לא נטענה בסשן הזה.
export const getTranslationsSync = (language: Language): Translations => cache[language] ?? he;
