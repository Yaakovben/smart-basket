import { stripFaithMarkers } from './formatFaithText';

export const MAX_TEXT_LENGTH = 500;

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
