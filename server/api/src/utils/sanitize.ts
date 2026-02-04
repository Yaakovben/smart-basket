import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize user input by removing all HTML tags
 * Use this for plain text fields like names, product names, etc.
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return input;

  return sanitizeHtml(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
  }).trim();
};

/**
 * Sanitize an object's string properties
 * Useful for sanitizing entire request bodies
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
  obj: T,
  keysToSanitize: (keyof T)[]
): T => {
  const sanitized = { ...obj };

  for (const key of keysToSanitize) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as T[keyof T];
    }
  }

  return sanitized;
};
