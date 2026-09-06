import { useEffect, useState } from 'react';
import { adminApi, type CloudinaryHealth } from '../../../services/api/admin.api';

interface UseCloudinaryHealthReturn {
  data: CloudinaryHealth | null;
  loading: boolean;
  lastFetchAt: Date | null;
  load: () => Promise<void>;
}

// חיווי שימוש ב-Cloudinary לטאב השני בכרטיס בריאות ה-DB. אותו דפוס כמו
// useDbHealth: טעינה ראשונית + load() לרענון ידני.
export const useCloudinaryHealth = (): UseCloudinaryHealthReturn => {
  const [data, setData] = useState<CloudinaryHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getCloudinaryHealth();
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
