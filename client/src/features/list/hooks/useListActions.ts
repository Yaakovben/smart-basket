import { useState, useCallback, useMemo } from 'react';
import type { List, User, Member, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { convertApiList } from '../../../global/hooks';
import { listsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import type { EditListForm, ConfirmState } from '../types/list-types';

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

  const hasListChanges = useMemo(() => {
    if (!editListData) return false;
    return (
      editListData.name !== list.name ||
      editListData.icon !== list.icon ||
      editListData.color !== list.color ||
      editListData.isPermanent !== !!list.isPermanent
    );
  }, [editListData, list.name, list.icon, list.color, list.isPermanent]);

  const handleEditList = useCallback(() => {
    setEditListData({ name: list.name, icon: list.icon, color: list.color, isPermanent: !!list.isPermanent });
    setShowEditList(true);
  }, [list.name, list.icon, list.color, list.isPermanent]);

  const saveListChanges = useCallback(async () => {
    if (!editListData || !hasListChanges) return;
    const oldData = { name: list.name, icon: list.icon, color: list.color, isPermanent: list.isPermanent };

    // עדכון אופטימיסטי - סגירת מודאל ועדכון מיידי
    setShowEditList(false);
    onUpdateListLocal({ ...list, ...editListData });

    try {
      await onUpdateList({ ...list, ...editListData });
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

  const refreshList = useCallback(async () => {
    setRefreshing(true);
    try {
      const apiList = await listsApi.getList(list.id);
      onUpdateList(convertApiList(apiList));
    } catch {
      showToast(t('errorOccurred'), 'error');
    } finally {
      setRefreshing(false);
    }
  }, [list.id, onUpdateList, showToast, t]);

  return {
    showEditList, setShowEditList,
    editListData, setEditListData,
    hasListChanges,
    refreshing,
    handleEditList,
    saveListChanges,
    handleDeleteList,
    removeMember,
    leaveList,
    refreshList,
  };
};
