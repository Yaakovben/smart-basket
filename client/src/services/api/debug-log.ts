// לוג דיבאג, רק במצב פיתוח
export const debugLog = (message: string, data?: unknown, isError = false) => {
  if (import.meta.env.DEV) {
    if (isError) {
      console.error(`[API] ${message}`, data);
    } else {
      console.log(`[API] ${message}`, data);
    }
  }
};
