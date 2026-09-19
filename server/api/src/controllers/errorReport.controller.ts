import type { Request, Response } from 'express';
import { sendAdminErrorReport, type ErrorReportPayload } from '../services/email.service';
import { logger } from '../config';

// throttle פשוט בזיכרון: מניעת flood של אותה שגיאה שוב ושוב.
// מפתח = message+type, ערך = timestamp אחרון. נוקה כל 10 דקות.
const recentErrors = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000; // אותה שגיאה לא תישלח שוב תוך 5 דקות
const MAX_CACHE_SIZE = 200;

setInterval(() => recentErrors.clear(), 10 * 60 * 1000);

export const reportClientError = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as ErrorReportPayload;

  const key = `${payload.type}|${payload.message.slice(0, 100)}`;
  const last = recentErrors.get(key) ?? 0;
  if (Date.now() - last < THROTTLE_MS) {
    res.json({ ok: true, throttled: true });
    return;
  }
  if (recentErrors.size >= MAX_CACHE_SIZE) recentErrors.clear();
  recentErrors.set(key, Date.now());

  // לוג פנימי תמיד (גם בלי מייל)
  logger.warn('[client-error] %s | %s | %s', payload.type, payload.message.slice(0, 200), payload.url);

  // שליחת מייל למנהל - fire-and-forget, לא חוסם את התשובה
  sendAdminErrorReport(payload).catch(() => {});

  res.json({ ok: true });
};
