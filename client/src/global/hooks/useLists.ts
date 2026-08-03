import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { User, List } from "../types";
import { listsApi, type ApiList } from "../../services/api";
import { convertApiList } from "./converters";
import { readListsCache, writeListsCache } from "./useLists.cache";
import { useListActions } from "./useLists.actions";
import { useListsSocketSync } from "./useLists.socketSync";

export function useLists(user: User | null, initialLists?: ApiList[] | null, authLoading?: boolean) {
  // עדיפות לרינדור מיידי: initialLists (נטען מקבילית) > localStorage cache > [].
  const [lists, setLists] = useState<List[]>(() => {
    if (initialLists) return initialLists.map(l => convertApiList(l));
    const cached = readListsCache();
    if (cached) return cached.map(l => convertApiList(l));
    return [];
  });
  // loading=true רק אם באמת אין כלום להציג. אם יש cache, מציגים אותו ומרעננים ברקע.
  const [loading, setLoading] = useState(() => !initialLists && !readListsCache());
  const [fetchError, setFetchError] = useState(false);
  // מעקב איזה משתמש כבר אותחל עם נתונים מראש
  const initializedForRef = useRef<string | null>(initialLists ? '__initial__' : null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const apiLists = await listsApi.getLists();
      setLists(apiLists.map(l => convertApiList(l)));
      writeListsCache(apiLists);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // סנכרון עם נתונים מראש כשהם מגיעים מטעינה מקבילית - וגם שמירה לקאש
  useEffect(() => {
    if (initialLists && !initializedForRef.current) {
      setLists(initialLists.map(l => convertApiList(l)));
      writeListsCache(initialLists);
      initializedForRef.current = '__initial__';
    }
  }, [initialLists]);

  // טעינת רשימות כשמשתמש משתנה (דילוג אם כבר אותחל עם נתונים מראש)
  // לא טוענים בזמן אימות ראשוני, מחכים לנתונים מראש
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // משתמש השתנה מאז האתחול האחרון, צריך נתונים חדשים
      if (initializedForRef.current && initializedForRef.current !== user.id) {
        initializedForRef.current = null;
      }
      // דילוג על טעינה אם כבר יש נתונים מראש למשתמש הזה
      if (initializedForRef.current) {
        initializedForRef.current = user.id;
        return;
      }
      initializedForRef.current = user.id;
      fetchLists();
    } else {
      initializedForRef.current = null;
      setLists([]);
      setFetchError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- טעינה מחדש רק כשמזהה המשתמש משתנה או האימות מסתיים
  }, [authLoading, user?.id, fetchLists]);

  // Auto-retry: כשיש שגיאת רשת (אין רשת/השרת לא עונה), מנסים שוב כל 4 שניות
  // עד שמצליחים. מפסיקים אם המשתמש נותק. ככה הלקוח לא תקוע במסך 'אין חיבור' -
  // האפליקציה ממשיכה לנסות ברקע ומופיעה ברגע שהחיבור חוזר.
  useEffect(() => {
    if (!fetchError || !user || authLoading) return;
    const id = window.setInterval(() => { void fetchLists(); }, 4000);
    return () => window.clearInterval(id);
  }, [fetchError, user, authLoading, fetchLists]);

  // רענון מיידי כשהרשת חוזרת (גם אחרי סנכרון תור אופליין)
  useEffect(() => {
    if (!user) return;
    const onOnline = () => { void fetchLists(); };
    const onSynced = () => { void fetchLists(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('sb:offline-synced', onSynced);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('sb:offline-synced', onSynced);
    };
  }, [user, fetchLists]);

  const actions = useListActions(user, lists, setLists);

  // חילוץ מזהי רשימות למעקב תלויות יציב
  const listIds = useMemo(() => lists.map(l => l.id).join(','), [lists]);

  // הרשמה לאירועי socket לעדכונים בזמן אמת
  useListsSocketSync(user, listIds, setLists);

  // טעינת כל הרשימות מחדש כשהאפליקציה חוזרת לחזית (למשל אחרי לחיצה על התראה)
  // אירועי socket שנשלחו בזמן שהאפליקציה ברקע אבדו, לכן צריך טעינה חדשה
  useEffect(() => {
    if (!user?.id) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLists();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user?.id, fetchLists]);

  return {
    lists,
    loading,
    fetchError,
    ...actions,
    refetch: fetchLists,
  };
}
