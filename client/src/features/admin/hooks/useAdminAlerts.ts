import { useEffect, useState } from 'react';
import { adminApi, type AdminAlerts } from '../../../services/api/admin.api';

const POLL_MS = 30_000;

// מצב משותף לכל דף המנהל: המספרים על אייקוני הכותרת ומתגי הפוש בתוך
// המסכים קוראים מאותו מקור, כך שפעולה במקום אחד מתעדכנת מיד בשני.
let current: AdminAlerts | null = null;
const listeners = new Set<(a: AdminAlerts | null) => void>();

const publish = (next: AdminAlerts | null) => {
  current = next;
  listeners.forEach((l) => l(next));
};

export const refreshAdminAlerts = () =>
  adminApi.getAlerts().then(publish).catch(() => { /* המספרים פשוט לא מוצגים */ });

/** האדמין פתח את מסך המשובים: המספר מתאפס מיד, והשרת מתעדכן ברקע. */
export const markAdminFeedbackSeen = () => {
  if (current) publish({ ...current, feedbackNew: 0 });
  adminApi.markFeedbackSeen().catch(() => { /* ננסה שוב בפתיחה הבאה */ });
};

/** הפעלה או כיבוי של פוש לתחום אחד. מתעדכן מיד, וחוזר אחורה אם השמירה נכשלה. */
export const setAdminPush = async (key: 'pushOnSubscription' | 'pushOnFeedback', value: boolean) => {
  const before = current;
  if (current) publish({ ...current, [key]: value });
  try {
    publish(await adminApi.updateAlertSettings({ [key]: value }));
  } catch {
    publish(before);
    throw new Error('save_failed');
  }
};

/**
 * poll=true רק ברכיב אחד (הכותרת): טוען מיד ומרענן כל 30 שניות כשהמסך גלוי.
 * שאר הרכיבים רק מאזינים.
 */
export function useAdminAlerts({ poll = false }: { poll?: boolean } = {}) {
  const [alerts, setAlerts] = useState<AdminAlerts | null>(current);

  useEffect(() => {
    listeners.add(setAlerts);
    return () => { listeners.delete(setAlerts); };
  }, []);

  useEffect(() => {
    if (!poll) {
      if (!current) void refreshAdminAlerts();
      return;
    }
    void refreshAdminAlerts();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshAdminAlerts(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  return alerts;
}
