import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AiStatus } from '../../../services/api/admin.api';

interface UseAiStatusReturn {
  data: AiStatus | null;
  loading: boolean;
  refreshing: boolean;
  lastFetchAt: Date | null;
  refreshError: string | null;
  load: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export const useAiStatus = (): UseAiStatusReturn => {
  const [data, setData] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  // חיווי שגיאה לרענון הידני בלבד - טעינה ראשונית (load) כבר מטפלת בכישלון
  // בשקט (מציגה "לא ניתן לטעון"), אבל רענון ביוזמת המנהל חייב להראות
  // בבירור שהוא נכשל, אחרת נראה כאילו שום דבר לא קרה בלחיצה על הכפתור.
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
    setRefreshError(null);
    try {
      const r = await adminApi.refreshAiStatus();
      setData(r);
      setLastFetchAt(new Date());
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setRefreshError(status ? `הרענון נכשל (שגיאה ${status})` : 'הרענון נכשל - בדוק חיבור לשרת');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, refreshing, lastFetchAt, refreshError, load, forceRefresh };
};
