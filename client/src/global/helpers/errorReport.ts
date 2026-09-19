// שליחת דוחות שגיאה לשרת → מייל למנהל.
// throttle צד-לקוח: אותה שגיאה לא תישלח פעמיים באותו סשן.

import { API_URL } from '../../services/api/client';

type ErrorType = 'global' | 'unhandledRejection' | 'react';

const sentThisSession = new Set<string>();

export function reportError(
  type: ErrorType,
  error: unknown,
  extra?: { url?: string }
): void {
  // רק ב-production - אין טעם להציף מיילים בזמן פיתוח
  if (import.meta.env.DEV) return;

  const message = error instanceof Error
    ? error.message
    : String(error).slice(0, 400);

  const key = `${type}|${message.slice(0, 100)}`;
  if (sentThisSession.has(key)) return;
  sentThisSession.add(key);

  const payload = {
    type,
    message,
    stack: error instanceof Error ? (error.stack ?? '') : '',
    url: extra?.url ?? window.location.href,
    userAgent: navigator.userAgent,
    buildVersion: typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : '',
    timestamp: new Date().toISOString(),
  };

  // fire-and-forget עם fetch רגיל (לא axios) - לא רוצים תלות בתשתית ה-app
  fetch(`${API_URL}/error-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true, // שורד גם אם הדף נסגר
  }).catch(() => {});
}
