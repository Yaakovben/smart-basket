import { stripFaithMarkers } from './formatFaithText';

export const MAX_TEXT_LENGTH = 500;

// פורמט תאריך יחסי קצר - לתגית ליד כל משפט
export const formatRelativeDate = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  return `לפני ${Math.floor(days / 30)} חודשים`;
};

// נורמליזציה להשוואת טקסט - בלי סימוני bold, בלי רווחים כפולים, lowercase
export const normalizeForCompare = (t: string): string => {
  return stripFaithMarkers(t).replace(/\s+/g, ' ').trim().toLowerCase();
};

// צבע מונה התווים לפי קרבה למגבלה
export const getCharCountColor = (count: number): string => {
  if (count >= MAX_TEXT_LENGTH * 0.9) return '#EF4444';
  if (count >= MAX_TEXT_LENGTH * 0.75) return '#F59E0B';
  return 'text.disabled';
};
