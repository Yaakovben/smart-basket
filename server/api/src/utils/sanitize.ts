import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user input by removing all HTML tags
 * Use this for plain text fields like names, product names, etc.
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  return sanitizeHtml(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
  }).trim();
};

