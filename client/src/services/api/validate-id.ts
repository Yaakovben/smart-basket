// בדיקת תקינות ObjectId למניעת שגיאות ולידציה בשרת
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const validateId = (id: string, name: string): void => {
  if (!id || !OBJECT_ID_REGEX.test(id)) {
    if (import.meta.env.DEV) console.error(`[API] Invalid ${name}: "${id}"`);
    throw new Error(`Invalid ${name}: "${id}"`);
  }
};
