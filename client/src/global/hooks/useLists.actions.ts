// פעולות CRUD על רשימות (יצירה/עדכון/מחיקה/הצטרפות/עזיבה), מופרד מ-useLists לקריאות
import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { List, Product, User } from "../types";
import { listsApi } from "../../services/api";
import { socketService } from "../../services/socket";
import { trackEvent } from "../services/analytics";
import { convertApiList } from "./converters";

export function useListActions(user: User | null, lists: List[], setLists: Dispatch<SetStateAction<List[]>>) {
  const createList = useCallback(
    async (list: { name: string; icon: string; color: string; isGroup: boolean; password?: string | null }) => {
      // שליחה לשרת קודם, הוספה ל-UI רק אחרי אישור
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

      // הודעת socket לחברי הקבוצה לפני מחיקה
      if (listToDelete?.isGroup && user) {
        const memberIds = listToDelete.members
          .map((m) => m.id)
          .filter((id) => id !== user.id);
        if (memberIds.length > 0) {
          await new Promise<void>((resolve) => {
            socketService.emitListDeleted(listId, listToDelete.name, memberIds, user.name, () => {
              resolve();
            });
            setTimeout(resolve, 5000);
          });
        }
      }

      // מחיקה בשרת קודם, הסרה מה-UI רק אחרי אישור
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
        const apiError = error as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string };
        const status = apiError.response?.status;
        const errorMessage = apiError.response?.data?.message || apiError.response?.data?.error;

        // שגיאת רשת או timeout
        if (apiError.code === 'ERR_NETWORK' || apiError.code === 'ECONNABORTED') {
          return { success: false, error: 'networkError' };
        }

        // מיפוי שגיאות ספציפיות למפתחות תרגום
        if (errorMessage?.toLowerCase().includes('owner')) {
          return { success: false, error: 'youAreOwner' };
        }
        if (status === 404 || errorMessage?.toLowerCase().includes('invalid invite code')) {
          return { success: false, error: 'invalidGroupCode' };
        }
        if (status === 400 || errorMessage?.toLowerCase().includes('invalid password')) {
          return { success: false, error: 'invalidGroupPassword' };
        }
        if (status === 409 || errorMessage?.toLowerCase().includes('already a member')) {
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

      // הודעת socket לחברי הקבוצה לפני עזיבה
      if (listToLeave) {
        await new Promise<void>((resolve) => {
          socketService.emitMemberLeft(listId, listToLeave.name, user.name, () => {
            resolve();
          });
          setTimeout(resolve, 5000);
        });
      }

      // עזיבה בשרת קודם, הסרה מה-UI רק אחרי אישור
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
  const updateProductsForList = useCallback(
    (listId: string, updater: (products: Product[]) => Product[]) => {
      setLists((prev) =>
        prev.map((l) => l.id === listId ? { ...l, products: updater(l.products), updatedAt: new Date().toISOString() } : l),
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
