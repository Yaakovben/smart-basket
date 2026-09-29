import type { Language } from '../types';
import { detectAppPlatform } from './appPlatform';

// הסבר איך לאפשר התראות שנחסמו, באפליקציה מהחנות: בהגדרות המכשיר ולא
// בהגדרות הדפדפן (הטקסט הכללי מדבר על דפדפן). null מחוץ לאפליקציה.
const TEXT: Record<Language, { ios: string; android: string }> = {
  he: {
    ios: '⚠️ ההתראות כבויות.\nהגדרות ← Smart Basket ← עדכונים ← לאפשר עדכונים',
    android: '⚠️ ההתראות כבויות.\nהגדרות ← אפליקציות ← Smart Basket ← התראות ← להפעיל',
  },
  en: {
    ios: '⚠️ Notifications are off.\nSettings → Smart Basket → Notifications → Allow Notifications',
    android: '⚠️ Notifications are off.\nSettings → Apps → Smart Basket → Notifications → Turn on',
  },
  ru: {
    ios: '⚠️ Уведомления выключены.\nНастройки → Smart Basket → Уведомления → Допуск уведомлений',
    android: '⚠️ Уведомления выключены.\nНастройки → Приложения → Smart Basket → Уведомления → Включить',
  },
};

export function nativePushBlockedHint(language: Language): string | null {
  const p = detectAppPlatform();
  if (p !== 'ios' && p !== 'android') return null;
  return (TEXT[language] ?? TEXT.he)[p];
}
