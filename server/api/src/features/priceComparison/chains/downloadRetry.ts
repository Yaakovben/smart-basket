/**
 * ניסיון חוזר להורדת קובץ בודד מפורטל.
 *
 * בלולאות ההורדה קובץ שנכשל מדולג, והסניף שלו נשאר בלי מחירים עד הסנכרון הבא.
 * בסנכרון של קרפור ב-29.9.2026 נכשלו כך 32 מתוך 146 קבצים, ובבדיקה מיד אחר כך
 * כולם ירדו תקין: תקלות רגעיות. לכן כל כשל מקבל עוד ניסיון, חוץ מתשובת 4xx
 * (הקובץ לא קיים או אסור), שניסיון חוזר לא ישנה.
 */

const statusOf = (err: unknown): number | undefined => {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (typeof status === 'number') return status;
  const m = err instanceof Error ? err.message.match(/_http_(\d{3})/) : null;
  return m ? Number(m[1]) : undefined;
};

export const isPermanentDownloadError = (err: unknown): boolean => {
  const status = statusOf(err);
  return status !== undefined && status >= 400 && status < 500;
};

export async function retryDownload<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 2000): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts || isPermanentDownloadError(err)) throw err;
      await new Promise<void>(r => setTimeout(r, baseDelayMs * i));
    }
  }
}
