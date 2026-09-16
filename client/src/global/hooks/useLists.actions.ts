// פעולות CRUD על רשימות (יצירה/עדכון/מחיקה/הצטרפות/עזיבה), מופרד מ-useLists לקריאות
import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { List, Product, User } from "../types";
import { listsApi } from "../../services/api";
import { socketService } from "../../services/socket";
import { trackEvent } from "../services/analytics";
import { convertApiList } from "./converters";
import { emitPlanLimit } from "../helpers/planLimitEvent";

// שגיאה פנימית המסמנת ש-plan limit טופל (modal נפתח) — הקורא לא מציג הצלחה ולא שגיאה
export class PlanLimitHandledError extends Error {
  constructor() { super('plan-limit-handled'); }
}

export function useListActions(user: User | null, lists: List[], setLists: Dispatch<SetStateAction<List[]>>) {
  const createList = useCallback(
    async (list: { name: string; icon: string; color: string; isGroup: boolean; password?: string | null }) => {
      try {
        const newList = await listsApi.createList({
          name: list.name,
          icon: list.icon,
          color: list.color,
          isGroup: list.isGroup,
          password: list.password || undefined,
        });

        const converted = convertApiList(newList);
        setLists((prev) => [...prev, converted]);
        socketService.joinList(newList.id);
        trackEvent('list_created', { isGroup: list.isGroup });

        return converted;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 402) {
          emitPlanLimit('lists');
          // זורק שגיאה ייעודית: הקורא (handleCreate) יסגור את המודאל בלי טוסט הצלחה ובלי הודעת שגיאה
          throw new PlanLimitHandledError();
        }
        throw err;
      }
    },
    [setLists],
  );

  // עדכון מקומי ללא קריאה לשרת (לאירועי socket)
  const updateListLocal = useCallback(
    (updatedList: List) => {
      setLists((prev) =>
        prev.map((l) => (l.id === updatedList.id ? updatedList : l)),
      );
    },
    [setLists],
  );

  const updateList = useCallback(
    async (updatedList: List) => {
      // מציאת רשימה ישנה להשוואה מה השתנה
      const oldList = lists.find((l) => l.id === updatedList.id);

      // בדיקה אם יש המרה מרשימה פרטית לקבוצה או להפך
      const isConvertingToGroup = updatedList.isGroup && oldList && !oldList.isGroup;
      const isConvertingToPrivate = !updatedList.isGroup && oldList && oldList.isGroup;
      const passwordChanged = updatedList.isGroup && oldList?.isGroup && updatedList.password !== oldList.password;
      const updated = await listsApi.updateList(updatedList.id, {
        name: updatedList.name,
        icon: updatedList.icon,
        color: updatedList.color,
        ...(isConvertingToGroup ? { isGroup: true, password: updatedList.password || undefined } : {}),
        ...(isConvertingToPrivate ? { isGroup: false } : {}),
        ...(passwordChanged ? { password: updatedList.password || undefined } : {}),
      });
      setLists((prev) =>
        prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
      );
      // שליחת אירוע socket לקבוצות להודעה בזמן אמת לחברים
      if (updatedList.isGroup && user && oldList) {
        // זיהוי מה השתנה
        const nameChanged = oldList.name !== updatedList.name;
        const designChanged = oldList.icon !== updatedList.icon || oldList.color !== updatedList.color;

        let changeType: 'name' | 'design' | 'both' | undefined;
        if (nameChanged && designChanged) {
          changeType = 'both';
        } else if (nameChanged) {
          changeType = 'name';
        } else if (designChanged) {
          changeType = 'design';
        }

        socketService.emitListUpdated(
          updatedList.id,
          oldList.name, // שם ישן להקשר
          user.name,
          changeType,
          nameChanged ? updatedList.name : undefined
        );
      }
    },
    [user, lists, setLists],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const listToDelete = lists.find((l) => l.id === listId);

      // הודעת socket לחברי הקבוצה - fire-and-forget, לא חוסם את המחיקה עצמה.
      // קודם היה await על ack עם fallback של עד 5 שניות (!) לפני שהמחיקה
      // בכלל התחילה - כל עיכוב/ניתוק בסוקט הפך "מחיקת רשימה" לאיטית באופן
      // דרמטי. הנתונים הדרושים (שם, מזהי חברים) כבר נלכדים כאן למעלה, אז אין
      // תלות סדר אמיתית בין השליחה למחיקה עצמה - שתיהן יכולות לרוץ במקביל.
      if (listToDelete?.isGroup && user) {
        const memberIds = listToDelete.members
          .map((m) => m.id)
          .filter((id) => id !== user.id);
        if (memberIds.length > 0) {
          socketService.emitListDeleted(listId, listToDelete.name, memberIds, user.name);
        }
      }

      // מחיקה בשרת, הסרה מה-UI רק אחרי אישור
      await listsApi.deleteList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    },
    [lists, user, setLists],
  );

  const joinGroup = useCallback(
    async (code: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "userNotLoggedIn" };

      try {
        const joinedList = await listsApi.joinGroup({ inviteCode: code, password });
        setLists((prev) => [...prev, convertApiList(joinedList)]);
        // הצטרפות לחדר socket, הודעה לחברים אחרי אישור השרת
        socketService.joinList(joinedList.id, () => {
          socketService.emitMemberJoined(joinedList.id, joinedList.name, user!.name);
        });
        trackEvent('group_joined'); // לופ ויראלי - הצטרפות דרך קוד הזמנה
        return { success: true };
      } catch (error: unknown) {
        const apiError = error as { response?: { status?: number; data?: { message?: string; error?: { code?: string; message?: string } | string } }; code?: string };
        const status = apiError.response?.status;
        const errorData = apiError.response?.data?.error;
        const errorCode = typeof errorData === 'object' ? errorData?.code : undefined;
        const errorMessage = apiError.response?.data?.message
          || (typeof errorData === 'string' ? errorData : errorData?.message)
          || '';

        // שגיאת רשת או timeout
        if (apiError.code === 'ERR_NETWORK' || apiError.code === 'ECONNABORTED') {
          return { success: false, error: 'networkError' };
        }

        // קבוצה מלאה — בעלים חינמי הגיע למגבלת חברים. זה לא בעיה של המצטרף.
        if (errorCode === 'GROUP_FULL') {
          return { success: false, error: 'groupFull' };
        }

        // מגבלת מנוי של המצטרף עצמו (תרחיש עתידי, כרגע לא קורה)
        if (status === 402) {
          emitPlanLimit('members');
          return { success: false, error: 'planLimitReached' };
        }

        // מיפוי שגיאות ספציפיות למפתחות תרגום
        if (errorMessage.toLowerCase().includes('owner')) {
          return { success: false, error: 'youAreOwner' };
        }
        if (status === 404 || errorMessage.toLowerCase().includes('invalid invite code')) {
          return { success: false, error: 'invalidGroupCode' };
        }
        if (status === 400 || errorMessage.toLowerCase().includes('invalid password')) {
          return { success: false, error: 'invalidGroupPassword' };
        }
        if (status === 409 || errorMessage.toLowerCase().includes('already a member')) {
          return { success: false, error: 'alreadyMember' };
        }
        if (status === 429) {
          return { success: false, error: 'tooManyAttempts' };
        }

        return { success: false, error: 'unknownError' };
      }
    },
    [user, setLists],
  );

  const leaveList = useCallback(
    async (listId: string) => {
      if (!user) return;

      const listToLeave = lists.find((l) => l.id === listId);

      // הודעת socket לחברי הקבוצה - fire-and-forget, לא חוסם את העזיבה עצמה
      // (ראו הערה זהה ב-deleteList למעלה).
      if (listToLeave) {
        socketService.emitMemberLeft(listId, listToLeave.name, user.name);
      }

      // עזיבה בשרת, הסרה מה-UI רק אחרי אישור
      await listsApi.leaveGroup(listId);
      socketService.leaveList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    },
    [user, lists, setLists],
  );

  // הסרת רשימה מקומית ללא קריאת API (כשמשתמש הוסר מהקבוצה)
  const removeListLocal = useCallback(
    (listId: string) => {
      socketService.leaveList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    },
    [setLists],
  );

  // עדכון מוצרים אטומי - משתמש ב-functional state update למניעת stale closures
  // מעדכן גם את updatedAt כדי שזמן העדכון יתרענן ב-UI
  // extraPatch אופציונלי - שדות ברמת הרשימה (למשל productsManuallyOrdered)
  // שצריך לעדכן *באותה* קריאת setLists יחד עם המוצרים - לא בקריאה נפרדת,
  // אחרת קריאה שנייה שמחליפה את כל אובייקט הרשימה עלולה לדרוס בחזרה את
  // עדכון המוצרים שזה עתה בוצע (ראו ההערה סביב applyLocalOrder ב-ListComponent).
  const updateProductsForList = useCallback(
    (listId: string, updater: (products: Product[]) => Product[], extraPatch?: Partial<List>) => {
      setLists((prev) =>
        prev.map((l) => l.id === listId ? { ...l, ...extraPatch, products: updater(l.products), updatedAt: new Date().toISOString() } : l),
      );
    },
    [setLists],
  );

  return {
    createList,
    updateList,
    updateListLocal,
    deleteList,
    joinGroup,
    leaveList,
    removeListLocal,
    updateProductsForList,
  };
}
