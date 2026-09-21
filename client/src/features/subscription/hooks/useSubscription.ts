import { useCallback, useEffect, useState } from 'react';
import { subscriptionApi, type SubscriptionStatus, type SubscriptionPayMethod } from '../../../services/api/subscription.api';

// טעינה ופעולות של עמוד המנוי. אחרי כל פעולה טוענים מחדש את המצב מהשרת (מקור
// האמת) במקום לנחש אותו בלקוח.
export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      setStatus(await subscriptionApi.getStatus());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // כל פעולה מחזירה true בהצלחה. שגיאות מוחזרות ל-caller כדי להציג הודעה מתאימה.
  const run = useCallback(async (action: () => Promise<unknown>): Promise<{ ok: boolean; code?: string }> => {
    setBusy(true);
    try {
      await action();
      await load(true);
      return { ok: true };
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
      await load(true);
      return { ok: false, code };
    } finally {
      setBusy(false);
    }
  }, [load]);

  const createRequest = useCallback((months: number, method: SubscriptionPayMethod) => run(() => subscriptionApi.createRequest(months, method)), [run]);
  const reportPaid = useCallback((id: string) => run(() => subscriptionApi.reportPaid(id)), [run]);
  const cancelRequest = useCallback((id: string) => run(() => subscriptionApi.cancelRequest(id)), [run]);

  return { status, loading, error, busy, reload: load, createRequest, reportPaid, cancelRequest };
}
