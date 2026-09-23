import { useEffect, useState } from 'react';
import { adminApi, type DbHealth } from '../../../services/api/admin.api';

interface UseDbHealthReturn {
  data: DbHealth | null;
  loading: boolean;
  lastFetchAt: Date | null;
  load: () => Promise<boolean>;
}

export const useDbHealth = (): UseDbHealthReturn => {
  const [data, setData] = useState<DbHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);

  // מחזיר Promise<boolean> (הצלחה אמיתית) כדי שרענון בגרירה ידע להציג חיווי
  // כישלון - לא רק להיעלם בשקט כשהבקשה נכשלת.
  const load = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const r = await adminApi.getDbHealth();
      setData(r);
      setLastFetchAt(new Date());
      return true;
    } catch {
      setData(null);
      return false;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return { data, loading, lastFetchAt, load };
};
