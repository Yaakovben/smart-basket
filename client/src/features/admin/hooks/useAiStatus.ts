import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AiStatus } from '../../../services/api/admin.api';

interface UseAiStatusReturn {
  data: AiStatus | null;
  loading: boolean;
  refreshing: boolean;
  lastFetchAt: Date | null;
  load: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export const useAiStatus = (): UseAiStatusReturn => {
  const [data, setData] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getAiStatus();
      setData(r);
      setLastFetchAt(new Date());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // מאלץ בדיקה מחדש של המודל ב-Groq עכשיו (endpoint נפרד מ-load הרגיל) -
  // זו האופציה ל"עדכון עכשווי" שהמנהל יכול להפעיל ידנית.
  const forceRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await adminApi.refreshAiStatus();
      setData(r);
      setLastFetchAt(new Date());
    } catch {
      // נשארים עם הנתונים הקודמים אם הרענון נכשל
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, refreshing, lastFetchAt, load, forceRefresh };
};
