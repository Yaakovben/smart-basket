// הרשמה לאירועי socket לעדכוני רשימות בזמן אמת (חיבור לחדרים + טעינה מחדש מושהית)
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { List, User } from "../types";
import { listsApi } from "../../services/api";
import { socketService } from "../../services/socket";
import { convertApiList } from "./converters";

export function useListsSocketSync(user: User | null, listIds: string, setLists: Dispatch<SetStateAction<List[]>>) {
  // משתנים לטעינה מחדש מושהית (מונע קריאות API כפולות לאותה רשימה)
  const pendingRefetchIds = useRef<Set<string>>(new Set());
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    // פירוק מזהי רשימות מהמחרוזת
    const currentIds = listIds ? listIds.split(',') : [];

    // הצטרפות לכל חדרי הרשימות
    currentIds.forEach((id) => socketService.joinList(id));

    // טעינה מחדש מושהית, מאחדת בקשות מרובות לאותה רשימה
    const scheduleRefetch = (listId: string) => {
      pendingRefetchIds.current.add(listId);

      // ניקוי טיימר קיים
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }

      // תזמון טעינה מחדש אחרי 100ms ללא אירועים חדשים
      refetchTimeoutRef.current = setTimeout(() => {
        const idsToRefetch = Array.from(pendingRefetchIds.current);
        pendingRefetchIds.current.clear();

        // טעינת כל רשימה פעם אחת בלבד
        idsToRefetch.forEach((id) => {
          listsApi.getList(id).then((updated) => {
            setLists((prev) =>
              prev.map((l) => {
                if (l.id !== updated.id) return l;
                return convertApiList(updated);
              }),
            );
          }).catch(() => {
            // טעינה נכשלה, נתונים ישנים יוצגו עד הסנכרון הבא
          });
        });
      }, 100);
    };

    // האזנה לעדכוני רשימות
    const unsubscribeListUpdated = socketService.on('list:updated', (data: unknown) => {
      const listData = data as { listId: string };
      scheduleRefetch(listData.listId);
    });

    // הערה: אירועי user:joined ו user:left הם למעקב נוכחות בלבד
    // (חיבור/ניתוק socket של משתמש לחדר).
    // הם נשלחים בכל פתיחת אפליקציה, רענון, או התחברות מחדש, לא בשינויי חברות בפועל.
    // שינויי חברות אמיתיים עוברים דרך REST API ונשמרים כהתראות ב DB.
    // בכוונה לא טוענים מחדש נתוני רשימות באירועים אלו כדי למנוע:
    // 1. קריאות API מיותרות בכל התחברות מחדש
    // 2. בלבול משתמשים עם פעילות כשמישהו רק מתחבר מחדש

    // האזנה לאירועי מוצרים, כולם משתמשים בטעינה מושהית
    const unsubscribeProductAdded = socketService.on('product:added', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductUpdated = socketService.on('product:updated', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductDeleted = socketService.on('product:deleted', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductsCleared = socketService.on('products:cleared', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductsReordered = socketService.on('products:reordered', (data: unknown) => {
      const eventData = data as { listId: string; productIds?: string[]; manual?: boolean };

      // עדכון אופטימי מקומי *מיידי* - בלי לחכות לרענון מלא (100ms debounce
      // + round-trip רשת). מי שסידר כבר שמר ב-DB דרך REST; זה רק משקף אצל
      // שאר חברי הקבוצה את אותו סדר, באותו היגיון בדיוק כמו applyLocalOrder
      // ב-ListComponent.tsx (שמעדכן את מי שביצע את הגרירה עצמו). ה-refetch
      // למטה עדיין רץ כרשת ביטחון לעקביות סופית - זה תיקון תחושתי בלבד.
      if (Array.isArray(eventData.productIds) && eventData.productIds.length > 0 && typeof eventData.manual === 'boolean') {
        const { listId, productIds, manual } = eventData as { listId: string; productIds: string[]; manual: boolean };
        const rank = new Map(productIds.map((id, i) => [id, i]));
        const base = Date.now();
        setLists((prev) => prev.map((l) => {
          if (l.id !== listId) return l;
          return {
            ...l,
            productsManuallyOrdered: manual,
            products: l.products.map((p) => rank.has(p.id)
              ? { ...p, position: manual ? rank.get(p.id)! : base + rank.get(p.id)! * 1000 }
              : p),
          };
        }));
      }

      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductToggled = socketService.on('product:toggled', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    // האזנה לשינויי חברות (הצטרפות/עזיבה/הסרה) לעדכון רשימת החברים
    const unsubscribeNotificationNew = socketService.on('notification:new', (data: unknown) => {
      const eventData = data as { type: string; listId: string; userId: string };
      // טעינה מחדש רק בשינויי חברות, לא בסוגי התראות אחרים
      if (['join', 'leave', 'removed'].includes(eventData.type)) {
        scheduleRefetch(eventData.listId);
      }
    });

    return () => {
      // ניקוי טיימר טעינה ממתינה
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      unsubscribeListUpdated();
      unsubscribeProductAdded();
      unsubscribeProductUpdated();
      unsubscribeProductDeleted();
      unsubscribeProductsCleared();
      unsubscribeProductsReordered();
      unsubscribeProductToggled();
      unsubscribeNotificationNew();
      // יציאה מכל החדרים בניקוי
      currentIds.forEach((id) => socketService.leaveList(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- הרצה מחדש רק כשמזהה המשתמש או מזהי הרשימות משתנים
  }, [user?.id, listIds]);
}
