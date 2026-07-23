import { useEffect, useState } from 'react';
import { adminApi, type DbHealth } from '../../../services/api/admin.api';

interface UseDbHealthReturn {
  data: DbHealth | null;
  loading: boolean;
  lastFetchAt: Date | null;
  load: () => Promise<void>;
}

export const useDbHealth = (): UseDbHealthReturn => {
  const [data, setData] = useState<DbHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getDbHealth();
      setData(r);
      setLastFetchAt(new Date());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return { data, loading, lastFetchAt, load };
};
