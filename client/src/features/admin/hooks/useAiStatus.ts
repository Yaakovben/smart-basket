import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AiStatus } from '../../../services/api/admin.api';

interface UseAiStatusReturn {
  data: AiStatus | null;
  loading: boolean;
  refreshing: boolean;
  lastFetchAt: Date | null;
  refreshError: string | null;
  load: () => Promise<void>;
  forceRefresh: () => Promise<boolean>;
}

// autoLoad=false: לא יורה בקשה ב-mount - הקורא אחראי לקרוא ל-load() כשמתאים
// (למשל אחרי שנתוני הדשבורד הקריטיים כבר חזרו, כדי לא להתחרות איתם על אותו
// pool חיבורים/שרת ולעכב את מה שהמנהל באמת מחכה לו).
export const useAiStatus = (autoLoad = true): UseAiStatusReturn => {
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
  const forceRefresh = useCallback(async (): Promise<boolean> => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const r = await adminApi.refreshAiStatus();
      setData(r);
      setLastFetchAt(new Date());
      return true;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setRefreshError(status ? `הרענון נכשל (שגיאה ${status})` : 'הרענון נכשל - בדוק חיבור לשרת');
      return false;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (autoLoad) load(); }, [load, autoLoad]);

  return { data, loading, refreshing, lastFetchAt, refreshError, load, forceRefresh };
};
