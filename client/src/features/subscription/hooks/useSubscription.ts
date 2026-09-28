import { useCallback, useEffect, useState } from 'react';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import { peekSubscriptionStatus, loadSubscriptionStatus, subscribeSubscriptionStatus } from '../subscriptionStatusStore';

// מצב עמוד המנוי. מה שכבר ידוע מוצג מיד (בלי שלד טעינה), והנתון מהשרת
// מתעדכן ברקע. השרת הוא מקור האמת: אחרי רכישה טוענים מחדש, לא מנחשים.
export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(peekSubscriptionStatus);
  const [loading, setLoading] = useState(() => peekSubscriptionStatus() === null);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      setStatus(await loadSubscriptionStatus(true));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSubscriptionStatus(setStatus);
    // כשכבר יש נתון מוצג, הרענון שקט
    void load(peekSubscriptionStatus() !== null);
    return unsubscribe;
  }, [load]);

  return { status, loading, error, reload: load };
}
