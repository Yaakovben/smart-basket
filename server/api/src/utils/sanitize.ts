import sanitizeHtml from 'sanitize-html';

/**
 * ניקוי קלט משתמש מתגיות HTML.
 * לשדות טקסט פשוט: שמות, מוצרים וכו'.
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
};
