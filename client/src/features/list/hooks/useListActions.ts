import { useState, useCallback, useMemo } from 'react';
import type { List, User, Member, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { convertApiList } from '../../../global/hooks';
import { overlayQueuedMutations } from '../../../global/hooks/useLists.queueOverlay';
import { listsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import type { EditListForm, ConfirmState } from '../types/list-types';
import type { EditListSaveExtra } from '../components/modals/EditListModal';

interface UseListActionsParams {
  list: List;
  user: User;
  onUpdateList: (list: List) => void | Promise<void>;
  onUpdateListLocal: (list: List) => void;
  onLeaveList: (listId: string) => void | Promise<void>;
  onDeleteList: (listId: string) => void | Promise<void>;
  onBack: () => void;
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  t: (key: TranslationKeys) => string;
  setConfirm: (confirm: ConfirmState | null) => void;
}

// פעולות על הרשימה עצמה (לא על המוצרים בתוכה): עריכת פרטים, מחיקה,
// ניהול חברים, עזיבת קבוצה, ורענון מהשרת.
export const useListActions = ({
  list,
  user,
  onUpdateList,
  onUpdateListLocal,
  onLeaveList,
  onDeleteList,
  onBack,
  showToast,
  t,
  setConfirm,
}: UseListActionsParams) => {
  const [showEditList, setShowEditList] = useState(false);
  const [editListData, setEditListData] = useState<EditListForm | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // מאותחל ל"עכשיו" ולא ל-null: הרשימה שכבר מוצגת כשהמסך הזה עולה כבר טעונה
  // (מ-cache או מבקשה קודמת), אז "מעודכן ל-HH:MM" נכון להציג מיד. בלי זה
  // המשתמש לא רואה שום זמן במשיכה הראשונה - רק setLastFetchAt(refreshList)
  // עדכן את הערך, וזה קרה רק *אחרי* שהמשיכה הראשונה כבר הסתיימה.
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(() => new Date());

  const hasListChanges = useMemo(() => {
    if (!editListData) return false;
    return (
      editListData.name !== list.name ||
      editListData.icon !== list.icon ||
      editListData.color !== list.color
    );
  }, [editListData, list.name, list.icon, list.color]);

  const handleEditList = useCallback(() => {
    setEditListData({ name: list.name, icon: list.icon, color: list.color });
    setShowEditList(true);
  }, [list.name, list.icon, list.color]);

  // שם, עיצוב, קוד כניסה חדש והמרה למשותפת נשלחים בעדכון אחד: שני עדכונים
  // נפרדים יכלו לדרוס זה את זה, כי השני היה נשלח עם עותק הרשימה שלפני הראשון
  const saveListChanges = useCallback(async (extra?: EditListSaveExtra) => {
    if (!editListData || (!hasListChanges && !extra)) return;
    const oldData = { name: list.name, icon: list.icon, color: list.color, password: list.password, isGroup: list.isGroup };
    const next = {
      ...list, ...editListData,
      ...(extra ? { password: extra.password } : {}),
      ...(extra?.makeGroup ? { isGroup: true } : {}),
    };

    // עדכון אופטימיסטי - סגירת מודאל ועדכון מיידי
    setShowEditList(false);
    onUpdateListLocal(next);

    try {
      await onUpdateList(next);
      showToast(t('saved'));
    } catch {
      // שחזור במקרה של שגיאה
      onUpdateListLocal({ ...list, ...oldData });
      showToast(t('errorOccurred'), 'error');
    }
  }, [list, editListData, hasListChanges, onUpdateList, onUpdateListLocal, showToast, t]);

  const handleDeleteList = useCallback(async () => {
    try {
      await onDeleteList(list.id);
      onBack();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to delete list:', error);
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, onDeleteList, onBack, showToast, t]);

  const removeMember = useCallback((memberId: string, memberName: string) => {
    const message = t('removeMemberConfirm').replace('{name}', memberName);
    setConfirm({
      title: t('removeMember'),
      message,
      onConfirm: async () => {
        try {
          // קריאת API להסרת חבר
          await listsApi.removeMember(list.id, memberId);

          // שליחת אירוע socket להתראת המשתמש שהוסר
          socketService.emitMemberRemoved(list.id, list.name, memberId, memberName, user.name);

          // עדכון state מקומי (ללא קריאת API כי כבר קראנו)
          onUpdateListLocal({
            ...list,
            members: list.members.filter((m: Member) => m.id !== memberId)
          });
          showToast(t('removed'));
        } catch (error) {
          if (import.meta.env.DEV) console.error('Failed to remove member:', error);
          showToast(t('errorOccurred'), 'error');
        }
        setConfirm(null);
      }
    });
  }, [list, user.name, onUpdateListLocal, showToast, t, setConfirm]);

  const leaveList = useCallback(() => {
    setConfirm({
      title: t('leaveGroup'),
      message: t('leaveGroupConfirm'),
      onConfirm: async () => {
        try {
          await onLeaveList(list.id);
        } catch (error) {
          if (import.meta.env.DEV) console.error('Failed to leave group:', error);
          showToast(t('errorOccurred'), 'error');
        }
        setConfirm(null);
      }
    });
  }, [list.id, onLeaveList, showToast, t, setConfirm]);

  // מחזיר Promise<boolean> (הצלחה אמיתית) - כדי שהקורא (רענון בגרירה ב-
  // ListComponent) יציג את חיווי הכישלון האדום על הכרטיס הצף במקום טוסט
  // נפרד. שני חיוויים בו-זמנית על אותה פעולה מיותר ומבלבל.
  // רענון = קריאה בלבד. קודם הרשימה שנטענה עברה ל-onUpdateList, שכותב לשרת:
  // כל רענון שלח עדכון רשימה, ואם חבר אחר שינה את השם או את הסיסמה בינתיים,
  // נשלחה לקבוצה התראה שאתה שינית. עכשיו רק עדכון מקומי, עם הפעולות שעוד
  // ממתינות בתור האופליין מעל נתוני השרת (אחרת הן נעלמות עד הסנכרון).
  const refreshList = useCallback(async (): Promise<boolean> => {
    setRefreshing(true);
    try {
      const apiList = await listsApi.getList(list.id);
      const [fresh] = await overlayQueuedMutations([convertApiList(apiList)], user.name);
      onUpdateListLocal(fresh);
      setLastFetchAt(new Date());
      return true;
    } catch {
      return false;
    } finally {
      setRefreshing(false);
    }
  }, [list.id, user.name, onUpdateListLocal]);

  return {
    showEditList, setShowEditList,
    editListData, setEditListData,
    hasListChanges,
    refreshing,
    lastFetchAt,
    handleEditList,
    saveListChanges,
    handleDeleteList,
    removeMember,
    leaveList,
    refreshList,
  };
};
