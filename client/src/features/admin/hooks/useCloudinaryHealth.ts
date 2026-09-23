import { useEffect, useState } from 'react';
import { adminApi, type CloudinaryHealth } from '../../../services/api/admin.api';

interface UseCloudinaryHealthReturn {
  data: CloudinaryHealth | null;
  loading: boolean;
  lastFetchAt: Date | null;
  load: () => Promise<boolean>;
}

// חיווי שימוש ב-Cloudinary לטאב השני בכרטיס בריאות ה-DB. אותו דפוס כמו
// useDbHealth: טעינה ראשונית + load() לרענון ידני.
export const useCloudinaryHealth = (): UseCloudinaryHealthReturn => {
  const [data, setData] = useState<CloudinaryHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);

  // מחזיר Promise<boolean> (הצלחה אמיתית) - ראו useDbHealth.load.
  const load = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const r = await adminApi.getCloudinaryHealth();
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
