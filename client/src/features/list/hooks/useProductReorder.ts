import { useCallback, useMemo, type RefObject } from 'react';
import type { Product, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { productsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { getCategoryOrder } from '../helpers/list-helpers';
import { useDragReorder } from '../../../global/hooks/useDragReorder';

interface Params {
  listId: string;
  // המוצרים המוצגים כרגע (טאב "לקנות", ללא סינון קטגוריה/חיפוש), כבר
  // ממוינים לפי הסדר הנוכחי.
  items: Product[];
  userName: string;
  contentRef: RefObject<HTMLDivElement | null>;
  // עדכון אופטימי מקומי: מקבע positions לפי הסדר + דגל הרשימה.
  applyLocalOrder: (orderedIds: string[], manual: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  t: (key: TranslationKeys) => string;
}

// גרירה-לסידור-מחדש של מוצרים בתוך רשימה. המנוע (מחוות הגרירה, ה-
// transform-ים, הגלילה האוטומטית) משותף עם גרירת כרטיסי הרשימה במסך הבית -
// ראו useDragReorder. כאן רק ה"מה עושים עם הסדר החדש": שמירה אופטימית +
// API + סוקט, וכן "חזרה למיון לפי קטגוריה".
export function useProductReorder({ listId, items, userName, contentRef, applyLocalOrder, showToast, t }: Params) {
  // שמירה אופטימית: מיישמים את הסדר מקומית (התצוגה מתעדכנת מיידית -
  // "שקוף"), וה-API רץ ברקע. אם ייכשל - טוסט שגיאה; הסנכרון הבא יתקן.
  const persist = useCallback((ids: string[], manual: boolean) => {
    applyLocalOrder(ids, manual);
    productsApi.reorderProducts(listId, ids, manual)
      .then(() => {
        socketService.emitProductsReordered(listId, userName, ids, manual);
        showToast(t(manual ? 'orderSaved' : 'productOrderAuto'), 'success');
      })
      .catch(() => showToast(t('errorOccurred'), 'error'));
  }, [listId, userName, applyLocalOrder, showToast, t]);

  // getter לסדר הנוכחי - נקרא רק ברגע הכניסה למצב סידור (ראו useDragReorder.getIds).
  const getIds = useCallback(() => items.map((p) => p.id), [items]);

  const engine = useDragReorder({
    getIds,
    contentRef,
    onCommit: (finalIds) => persist(finalIds, true),
  });
  const { reorderMode, reorderedIds, exitReorder } = engine;

  // הסדר להצגה במצב סידור - lookup לפי id כדי לשרוד עדכוני מוצר תוך כדי.
  const orderedItems = useMemo(() => {
    if (!reorderMode || !reorderedIds) return items;
    const byId = new Map(items.map((p) => [p.id, p]));
    const result: Product[] = [];
    for (const id of reorderedIds) {
      const p = byId.get(id);
      if (p) result.push(p);
    }
    // מוצר שנוסף/הופיע אחרי הכניסה למצב סידור - נספח לסוף.
    for (const p of items) if (!reorderedIds.includes(p.id)) result.push(p);
    return result;
  }, [reorderMode, reorderedIds, items]);

  // חזרה למיון אוטומטי לפי קטגוריה→א"ב - שולח לשרת את הסדר הזה עם manual=false.
  const handleSortByCategory = useCallback(() => {
    const sorted = [...items]
      .sort((a, b) => {
        const diff = getCategoryOrder(a.category) - getCategoryOrder(b.category);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'he');
      })
      .map((p) => p.id);
    exitReorder();
    haptic('medium');
    persist(sorted, false);
  }, [items, exitReorder, persist]);

  return {
    orderedItems,
    reorderMode,
    dragIndex: engine.dragIndex,
    dragOffsetY: engine.dragOffsetY,
    getRowShift: engine.getRowShift,
    rowRefs: engine.rowRefs,
    hasChanges: engine.hasChanges,
    handleDragStart: engine.handleDragStart,
    handleSave: engine.handleSave,
    handleEnter: engine.handleEnter,
    handleCancel: engine.handleCancel,
    handleSortByCategory,
  };
}
