import { useState, useCallback } from 'react';
import type { Product, List, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { productsApi } from '../../../services/api';
import { isTempId } from '../helpers/list-helpers';
import { isNetworkError, enqueueToggle, enqueueDelete, enqueueAdd, updateQueuedAddPendingPurchase, removeQueuedAdd } from '../../../services/offlineQueue';

interface UseProductSelectionParams {
  list: List;
  onUpdateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  t: (key: TranslationKeys) => string;
}

// מצב בחירה מרובה של מוצרים (לחיצה ארוכה) ופעולות מרוכזות: סימון/ביטול
// סימון, ומחיקה עם undo.
export const useProductSelection = ({ list, onUpdateProductsForList, showToast, t }: UseProductSelectionParams) => {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedProducts(new Set());
  }, []);

  const handleLongPress = useCallback((productId: string) => {
    haptic('medium');
    setSelectionMode(true);
    setSelectedProducts(prev => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  }, []);

  const toggleSelected = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedProducts(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  // סימון/ביטול סימון מרוכז: עדכון אופטימי ושליחה לשרת. בלי קליטה כל
  // פעולה נשמרת בתור ומסתנכרנת כשהחיבור חוזר, בדיוק כמו סימון בודד.
  const bulkSetPurchased = useCallback((isPurchased: boolean) => {
    haptic('medium');
    const ids = Array.from(selectedProducts);
    const count = ids.length;
    const purchasedAt = isPurchased ? new Date().toISOString() : null;
    exitSelectionMode();
    onUpdateProductsForList(list.id, (current) =>
      current.map(p => ids.includes(p.id) ? { ...p, isPurchased, purchasedAt } : p)
    );
    showToast(`${count} ${t(isPurchased ? 'bulkMarkedPurchased' : 'bulkReturnedToList')}`);
    for (const id of ids) {
      // מוצר שעוד לא נשמר בשרת: מעדכנים את ההוספה שממתינה בתור
      if (isTempId(id)) {
        void updateQueuedAddPendingPurchase(id, isPurchased);
        continue;
      }
      productsApi.updateProduct(list.id, id, { isPurchased }).catch((error) => {
        if (isNetworkError(error)) void enqueueToggle(list.id, id, isPurchased);
      });
    }
  }, [selectedProducts, exitSelectionMode, onUpdateProductsForList, list.id, showToast, t]);

  // מחיקה מרוכזת עם אפשרות ביטול. בלי קליטה המחיקה נשמרת בתור, וגם
  // השחזור נשמר בתור כדי שיסונכרן אחריה.
  const bulkDelete = useCallback(() => {
    haptic('medium');
    const ids = Array.from(selectedProducts);
    const count = ids.length;
    const deletedProducts = list.products.filter((p: Product) => ids.includes(p.id) && !isTempId(p.id));
    exitSelectionMode();
    onUpdateProductsForList(list.id, (current) =>
      current.filter(p => !ids.includes(p.id))
    );
    for (const id of ids) {
      // מוצר שעוד לא נשמר בשרת: פשוט מבטלים את ההוספה שממתינה בתור
      if (isTempId(id)) {
        void removeQueuedAdd(id);
        continue;
      }
      productsApi.deleteProduct(list.id, id).catch((error) => {
        if (isNetworkError(error)) void enqueueDelete(list.id, id);
      });
    }
    showToast(`${count} ${t('bulkDeleted')}`, 'success', deletedProducts.length === 0 ? undefined : async () => {
      const tempProducts = deletedProducts.map(p => ({ ...p, id: `temp-undo-${Date.now()}-${Math.random()}` }));
      onUpdateProductsForList(list.id, (current) => [...current, ...tempProducts]);
      for (let i = 0; i < deletedProducts.length; i++) {
        const p = deletedProducts[i];
        const tempId = tempProducts[i].id;
        const productData = { name: p.name, quantity: p.quantity, unit: p.unit, category: p.category, note: p.note, image: p.image };
        try {
          const serverProduct = await productsApi.addProduct(list.id, productData);
          onUpdateProductsForList(list.id, (current) =>
            current.map(c => c.id === tempId ? { ...c, id: serverProduct.id } : c)
          );
          if (p.isPurchased) {
            productsApi.updateProduct(list.id, serverProduct.id, { isPurchased: true }).catch(() => {});
          }
        } catch (error) {
          if (isNetworkError(error)) {
            void enqueueAdd(list.id, productData, tempId, p.isPurchased || undefined);
          } else {
            onUpdateProductsForList(list.id, (current) => current.filter(c => c.id !== tempId));
          }
        }
      }
    });
  }, [selectedProducts, list.id, list.products, exitSelectionMode, onUpdateProductsForList, showToast, t]);

  // העברה מרוכזת לרשימה אחרת - קריאה אחת עם כל ה-IDs (לא לולאה כמו
  // bulkDelete/bulkSetPurchased) כי לשרת יש כבר endpoint מרוכז לזה.
  // עדכון אופטימי משני הצדדים: onUpdateProductsForList מעדכן לפי listId
  // בתוך ה-lists הגלובלי (לא רק את הרשימה הפתוחה כרגע) - כל הרשימות של
  // המשתמש כבר טעונות בזיכרון, אז אפשר לעדכן גם רשימת יעד שלא מוצגת כרגע,
  // בלי לחכות ל-refetch. בלי זה המשתמש שנכנס מיד לרשימת היעד לא רואה
  // את המוצרים שהועברו עד רענון ידני.
  const bulkMove = useCallback((targetListId: string) => {
    haptic('medium');
    const ids = Array.from(selectedProducts);
    const count = ids.length;
    const movedProducts = list.products.filter((p: Product) => ids.includes(p.id));
    exitSelectionMode();
    onUpdateProductsForList(list.id, (current) =>
      current.filter(p => !ids.includes(p.id))
    );
    onUpdateProductsForList(targetListId, (current) => [...current, ...movedProducts]);
    productsApi.moveProducts(list.id, targetListId, ids)
      .then(() => showToast(`${count} ${t('productsMoved')}`))
      .catch(() => {
        // כישלון בשרת - מחזירים את שני הצדדים למצב הקודם
        onUpdateProductsForList(list.id, (current) => [...current, ...movedProducts]);
        onUpdateProductsForList(targetListId, (current) => current.filter(p => !ids.includes(p.id)));
        showToast(t('errorOccurred'), 'error');
      });
  }, [selectedProducts, list.id, list.products, exitSelectionMode, onUpdateProductsForList, showToast, t]);

  return {
    selectedProducts,
    selectionMode,
    exitSelectionMode,
    handleLongPress,
    toggleSelected,
    selectAll,
    clearSelection,
    bulkSetPurchased,
    bulkDelete,
    bulkMove,
  };
};
