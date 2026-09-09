import { useCallback, useMemo, type RefObject } from 'react';
import type { List, User, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { authApi } from '../../../services/api';
import { useDragReorder } from '../../../global/hooks/useDragReorder';

// מיין רשימות לפי סדר-מזהים נתון (user.listOrder או הסדר הזמני בזמן גרירה).
// מזהים שלא מופיעים בסדר - נשארים בסוף לפי סדרם המקורי.
function sortByOrder(lists: List[], order: string[] | null | undefined): List[] {
  if (!order || order.length === 0) return lists;
  const idx = new Map(order.map((id, i) => [id, i]));
  return [...lists].sort((a, b) => {
    const ai = idx.get(a.id);
    const bi = idx.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return 0;
  });
}

// גרירה-לסידור-מחדש של כרטיסי רשימה במסך הבית. המנוע (מחוות הגרירה,
// ה-transform-ים, הגלילה האוטומטית) משותף עם גרירת מוצרים בתוך רשימה -
// ראו useDragReorder. כאן רק השמירה: אופטימית מקומית + PATCH לשרת.
export function useListReorder(
  contentRef: RefObject<HTMLDivElement | null>,
  display: List[],
  user: User,
  showToast: (message: string, type?: ToastType) => void,
  t: (key: TranslationKeys) => string,
) {
  // שמירה אופטימית: מעדכנים את user.listOrder מיד (התצוגה מתעדכנת) וה-API
  // רץ ברקע. כשל - החזרת הסדר הקודם + טוסט שגיאה.
  const persistOrder = useCallback((orderedIds: string[]) => {
    const prev = user.listOrder;
    // מוטציה מכוונת על ה-user (אותו דפוס כמו הקוד הקודם) - עדכון אופטימי
    // כדי שהתצוגה תשקף מיד; הסנכרון הבא ממילא מביא את הסדר הרשמי מהשרת.
    // eslint-disable-next-line react-hooks/immutability
    user.listOrder = orderedIds;
    authApi.updateListOrder(orderedIds)
      .then(() => showToast(t('orderSaved'), 'success'))
      .catch(() => {
        user.listOrder = prev;
        showToast(t('errorOccurred'), 'error');
      });
  }, [user, showToast, t]);

  // getter לסדר הנוכחי - נקרא רק ברגע הכניסה למצב סידור (ראו getIds).
  const getIds = useCallback(
    () => sortByOrder(display, user.listOrder).map((l) => l.id),
    [display, user.listOrder],
  );

  const engine = useDragReorder({ getIds, contentRef, onCommit: persistOrder });
  const { reorderMode, reorderedIds } = engine;

  // הסדר להצגה. במצב סידור - הסדר הזמני של הגרירה; אחרת - user.listOrder.
  // חשוב: המיון קורה *באותו* useMemo שתלוי ב-reorderedIds, כך שאחרי שמירה
  // (reorderedIds→null) הוא מחושב מחדש וקורא את user.listOrder המעודכן,
  // גם אם React לא "ראה" את המוטציה.
  const orderedDisplay = useMemo(() => {
    if (reorderMode && reorderedIds) return sortByOrder(display, reorderedIds);
    return sortByOrder(display, user.listOrder);
  }, [reorderMode, reorderedIds, display, user.listOrder]);

  return {
    orderedDisplay,
    reorderMode,
    dragIndex: engine.dragIndex,
    dragOffsetY: engine.dragOffsetY,
    getRowShift: engine.getRowShift,
    rowRefs: engine.rowRefs,
    hasOrderChanges: engine.hasChanges,
    handleDragStart: engine.handleDragStart,
    handleSaveOrder: engine.handleSave,
    handleEnterReorder: engine.handleEnter,
    handleCancelReorder: engine.handleCancel,
  };
}
