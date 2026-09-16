import { safeStorage } from './safeStorage';

// סופר "פתיחות אפליקציה" אמיתיות (לא כל render/StrictMode double-invoke) -
// נועד לתנאי כניסה כמו "הצג רק למי שפתח את האפליקציה מעל N פעמים"
// (ראו FeedbackPopup). נספר פעם אחת בלבד לכל טעינת JS בפועל - guard
// ברמת המודול, לא state, כדי לשרוד remount בלי לספור כפול.
const KEY = 'sb_app_open_count';
let _countedThisLoad = false;

export function getAppOpenCount(): number {
  return Number(safeStorage.get(KEY) ?? '0');
}

export function countAppOpen(): number {
  if (_countedThisLoad) return getAppOpenCount();
  _countedThisLoad = true;
  const count = getAppOpenCount() + 1;
  safeStorage.set(KEY, String(count));
  return count;
}
