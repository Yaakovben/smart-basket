import type { LoginActivity } from '../../../global/types';
import { EVENT_COLORS } from './usersTableHelpers';

type Platform = NonNullable<LoginActivity['platform']>;

// מאיפה נפתחה האפליקציה. רשומות ישנות (לפני שנשמר) בלי פלטפורמה.
const PLATFORM_LABEL: Record<Platform, string> = {
  browser: 'דפדפן',
  pwa: 'מסך הבית',
  ios: 'אפליקציית iPhone',
  android: 'אפליקציית Android',
};

export const methodColor = (method: string) =>
  method === 'google' ? EVENT_COLORS.google
    : method === 'apple' ? EVENT_COLORS.apple
    : method === 'app_open' ? EVENT_COLORS.app_open
    : EVENT_COLORS.login;

// תווית אחת לכל רישום: שיטת הכניסה, ומאיפה (אם ידוע).
// פתיחה: "פתיחה · מסך הבית". כניסה: "Google · דפדפן".
export const activityLabel = (
  method: string,
  platform: LoginActivity['platform'] | null | undefined,
  names: { app: string; google: string; email: string },
): string => {
  const where = platform ? PLATFORM_LABEL[platform] : null;
  if (method === 'app_open') return where ? `פתיחה · ${where}` : names.app;
  const how = method === 'google' ? names.google : method === 'apple' ? 'Apple' : names.email;
  return where ? `${how} · ${where}` : how;
};
