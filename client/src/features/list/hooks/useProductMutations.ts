import { useState, useRef, useCallback, type RefObject } from 'react';
import type { Product, List, User, ToastType, ProductEditEntry, ProductEditChange } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { trackEvent } from '../../../global/services/analytics';
import { productsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { isTempId } from '../helpers/list-helpers';
import { isNetworkError, enqueueToggle, enqueueUpdate, enqueueDelete, enqueueClear, enqueueReset, updateQueuedAddPendingPurchase } from '../../../services/offlineQueue';

interface UseProductMutationsParams {
  list: List;
  user: User;
  onUpdateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  t: (key: TranslationKeys) => string;
  productsRef: RefObject<Product[]>;
  pendingTempActions: RefObject<Map<string, 'toggle'>>;
  dismissHint: () => void;
  markPurchased: () => void;
  clearMarked: () => void;
  showEdit: Product | null;
  setShowEdit: (product: Product | null) => void;
  originalEditProduct: Product | null;
  setOriginalEditProduct: (product: Product | null) => void;
  hasProductChanges: boolean;
}

// פעולות שינוי מצב על מוצרים קיימים: סימון/ביטול, מחיקה עם undo, עריכה,
// ניקוי וניקוי-איפוס של הרשימה.
export const useProductMutations = ({
  list,
  user,
  onUpdateProductsForList,
  showToast,
  t,
  productsRef,
  pendingTempActions,
  dismissHint,
  markPurchased,
  clearMarked,
  showEdit,
  setShowEdit,
  originalEditProduct,
  setOriginalEditProduct,
  hasProductChanges,
}: UseProductMutationsParams) => {
  // תור מחיקות ל-undo
  const deletedStackRef = useRef<{ product: Product; index: number }[]>([]);

  const toggleProduct = useCallback(async (productId: string, silent = false) => {
    const product = productsRef.current.find((p: Product) => p.id === productId);
    if (!product) return;

    const newIsPurchased = !product.isPurchased;
    dismissHint();

    // עדכון אופטימיסטי מיידי - כולל purchasedBy, תואם למה שהשרת בפועל שומר
    // (product.service.ts: purchasedBy = userId אם isPurchased, אחרת null).
    // בלי זה "נקנה ע״י" בכרטיס/בפרטים נשאר עם הערך הישן עד לרענון מלא.
    if (newIsPurchased) {
      markPurchased();
    }
    onUpdateProductsForList(list.id, (currentProducts) =>
      currentProducts.map((p: Product) =>
        p.id === productId ? { ...p, isPurchased: newIsPurchased, purchasedBy: newIsPurchased ? user.name : null } : p
      )
    );

    // מוצר עם מזהה זמני: שמירת הפעולה בתור, תישלח לשרת אחרי קבלת מזהה אמיתי.
    // אם ההוספה כבר נכשלה ונשמרה ב-IndexedDB (offline) - pendingTempActions
    // (בזיכרון בלבד) לא ייקרא שוב אף פעם, אז מעדכנים גם את הרשומה בתור עצמה
    // כדי שהסנכרון יחיל את הסימון. אם ההוספה עוד לא נכשלה, זה no-op בטוח -
    // הטיפול הקיים ב-pendingTempActions עדיין יתפוס את המקרה הזה.
    if (isTempId(productId)) {
      pendingTempActions.current.set(productId, 'toggle');
      void updateQueuedAddPendingPurchase(productId, newIsPurchased);
      return;
    }

    try {
      await productsApi.updateProduct(list.id, productId, { isPurchased: newIsPurchased });
      socketService.emitProductToggled(list.id, productId, product.name, newIsPurchased, user.name);
      if (!silent) showToast(t(newIsPurchased ? 'markedAsPurchased' : 'markedAsNotPurchased'));
    } catch (error) {
      if (isNetworkError(error)) {
        // שמירה בתור לסנכרון כשהקליטה חוזרת, הסטייט נשאר אופטימיסטי
        void enqueueToggle(list.id, productId, newIsPurchased);
        return;
      }
      if (import.meta.env.DEV) console.error('Failed to toggle product:', { productId, listId: list.id, error });
      onUpdateProductsForList(list.id, (currentProducts) =>
        currentProducts.map((p: Product) =>
          p.id === productId ? { ...p, isPurchased: product.isPurchased, purchasedBy: product.purchasedBy } : p
        )
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, user.name, onUpdateProductsForList, showToast, t, dismissHint, markPurchased, productsRef, pendingTempActions]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (isTempId(productId)) {
      // מוצר שנוסף כרגע ועדיין לא קיבל מזהה אמיתי מהשרת - אי אפשר למחוק
      // עדיין (אין productId אמיתי). מודיעים למשתמש במקום no-op שקט.
      showToast(t('stillSyncingProduct'), 'info');
      return;
    }
    const currentProducts = productsRef.current;
    const index = currentProducts.findIndex((p: Product) => p.id === productId);
    if (index === -1) return;
    const product = currentProducts[index];

    clearMarked();

    // שמירה בתור מחיקות לשחזור
    deletedStackRef.current.push({ product, index });

    onUpdateProductsForList(list.id, (current) =>
      current.filter(p => p.id !== productId)
    );

    try {
      await productsApi.deleteProduct(list.id, productId);
      const stackSize = deletedStackRef.current.length;
      showToast(
        stackSize > 1
          ? `${stackSize} ${t('deleted')}`
          : `"${product.name}" ${t('deleted')}`,
        'success',
        () => {
          // undo - שחזור כל המוצרים שנמחקו
          const toRestore = [...deletedStackRef.current];
          deletedStackRef.current = [];

          // שחזור למיקומים המקוריים
          onUpdateProductsForList(list.id, (current) => {
            const restored = [...current];
            for (const item of toRestore.sort((a, b) => a.index - b.index)) {
              const tempId = `temp-undo-${Date.now()}-${Math.random()}`;
              const pos = Math.min(item.index, restored.length);
              restored.splice(pos, 0, { ...item.product, id: tempId });
              // שחזור בשרת - כולל הערה (note נתמך ביצירה). isPurchased לא נתמך
              // ב-create, אז אם המוצר היה מסומן כ"נקנה" משלימים את זה בעדכון נפרד.
              const wasPurchased = item.product.isPurchased;
              productsApi.addProduct(list.id, {
                name: item.product.name,
                quantity: item.product.quantity,
                unit: item.product.unit,
                category: item.product.category,
                note: item.product.note,
              }).then(async (serverProduct) => {
                onUpdateProductsForList(list.id, (c) =>
                  c.map(p => p.id === tempId ? { ...p, id: serverProduct.id } : p)
                );
                if (wasPurchased) {
                  try {
                    await productsApi.updateProduct(list.id, serverProduct.id, { isPurchased: true });
                    onUpdateProductsForList(list.id, (c) =>
                      c.map(p => p.id === serverProduct.id ? { ...p, isPurchased: true } : p)
                    );
                  } catch { /* לא קריטי - המוצר עצמו שוחזר בהצלחה */ }
                }
              }).catch(() => {
                onUpdateProductsForList(list.id, (c) => c.filter(p => p.id !== tempId));
              });
            }
            return restored;
          });
        }
      );
      socketService.emitProductDeleted(list.id, productId, product.name, user.name);

      // ניקוי תור אחרי timeout (אם המשתמש לא לחץ undo)
      setTimeout(() => {
        deletedStackRef.current = deletedStackRef.current.filter(
          d => d.product.id !== productId
        );
      }, 5000);
    } catch (error) {
      if (isNetworkError(error)) {
        void enqueueDelete(list.id, productId);
        // ניקוי entry מתור ה-undo - לא ניתן לשחזר מוצר שנמחק בעת אופליין
        deletedStackRef.current = deletedStackRef.current.filter(d => d.product.id !== productId);
        return;
      }
      if (import.meta.env.DEV) console.error('Failed to delete product:', error);
      onUpdateProductsForList(list.id, (current) => {
        const restored = [...current];
        restored.splice(Math.min(index, restored.length), 0, product);
        return restored;
      });
      deletedStackRef.current = deletedStackRef.current.filter(d => d.product.id !== productId);
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, user.name, onUpdateProductsForList, showToast, t, clearMarked, productsRef]);

  // ===== ניקוי רשימה =====
  const [showClearList, setShowClearList] = useState(false);

  const handleClearList = useCallback(async (filter: 'all' | 'purchased' | 'pending') => {
    const affectedItems = filter === 'all'
      ? list.products
      : filter === 'purchased'
        ? list.products.filter((p: Product) => p.isPurchased)
        : list.products.filter((p: Product) => !p.isPurchased);

    if (affectedItems.length === 0) return;
    setShowClearList(false);
    // מניעת חגיגה שגויה - ניקוי לא נחשב כסימון נקנה
    clearMarked();

    // מחיקה אופטימיסטית
    onUpdateProductsForList(list.id, (current) =>
      filter === 'all'
        ? []
        : filter === 'purchased'
          ? current.filter(p => !p.isPurchased)
          : current.filter(p => p.isPurchased)
    );

    try {
      await productsApi.clearProducts(list.id, filter);
      // עדכון חברי קבוצה דרך socket, התראה אחת של ניקוי רשימה
      socketService.emitProductsCleared(list.id, affectedItems.map(p => p.id), filter, user.name);
      showToast(t('listCleared'), 'success');
    } catch (error) {
      if (isNetworkError(error)) {
        // הסטייט האופטימיסטי (הניקוי) כבר הוחל - נשאר ככה, מסתנכרן בחזרה לרשת
        void enqueueClear(list.id, filter);
        return;
      }
      if (import.meta.env.DEV) console.error('Failed to clear list:', error);
      // שחזור
      onUpdateProductsForList(list.id, (current) => [...current, ...affectedItems]);
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, list.products, user.name, onUpdateProductsForList, showToast, t, clearMarked]);

  const saveEditedProduct = useCallback(async () => {
    if (!showEdit || !originalEditProduct || !hasProductChanges) return;
    if (isTempId(showEdit.id)) {
      // מוצר עדיין לא אושר מהשרת - אי אפשר לשמור עריכה עדיין
      showToast(t('stillSyncingProduct'), 'info');
      return;
    }
    haptic('medium');

    const editData = { ...showEdit };
    const original = { ...originalEditProduct };

    // בניית diff - שליחת שדות שהשתנו בלבד
    const changes: Record<string, unknown> = {};
    if (editData.name !== original.name) changes.name = editData.name;
    if (editData.quantity !== original.quantity) changes.quantity = editData.quantity;
    if (editData.unit !== original.unit) changes.unit = editData.unit;
    if (editData.category !== original.category) changes.category = editData.category;
    if ((editData.note || '') !== (original.note || '')) changes.note = editData.note || '';

    // עדכון אופטימיסטי - סגירת מודאל ועדכון UI מיידי. updatedBy מתעדכן רק אם
    // באמת יש שינוי בתוכן (אותה בדיקה כמו product.service.ts בשרת), כדי לא
    // להראות "עודכן ע״י" על שמירה בלי שינוי אמיתי. בונים גם רשומת
    // editHistory מקומית מתוך אותו diff (changes) - בלי זה הלוג בפרטי המוצר
    // נשאר ריק/מיושן עד לרענון מלא של הרשימה, בדיוק כמו הבאג שכבר תוקן פעם
    // ל-updatedBy/purchasedBy באותו hook.
    setShowEdit(null);
    setOriginalEditProduct(null);
    const hasContentChange = Object.keys(changes).length > 0;
    const fieldLabels: Record<string, ProductEditChange['field']> = { name: 'name', quantity: 'quantity', unit: 'unit', category: 'category', note: 'note' };
    const optimisticEditEntry: ProductEditEntry | null = hasContentChange ? {
      editedBy: user.name,
      editedAt: new Date().toISOString(),
      changes: Object.entries(changes).map(([field, newValue]) => ({
        field: fieldLabels[field],
        oldValue: original[field as keyof Product] as string | number,
        newValue: newValue as string | number,
      })),
    } : null;
    onUpdateProductsForList(list.id, (current) =>
      current.map(p => p.id === editData.id
        ? {
          ...p, name: editData.name, quantity: editData.quantity, unit: editData.unit, category: editData.category, note: editData.note,
          ...(hasContentChange ? { updatedBy: user.name, editHistory: [...(p.editHistory ?? []), optimisticEditEntry!].slice(-10) } : {}),
        }
        : p)
    );

    try {
      await productsApi.updateProduct(list.id, editData.id, changes);
      showToast(t('saved'));
      socketService.emitProductUpdated(list.id, {
        id: editData.id,
        name: editData.name,
        quantity: editData.quantity,
        unit: editData.unit,
        category: editData.category,
      }, user.name);
    } catch (error) {
      if (isNetworkError(error)) {
        void enqueueUpdate(list.id, editData.id, changes);
        return;
      }
      if (import.meta.env.DEV) console.error('Failed to update product:', error);
      onUpdateProductsForList(list.id, (current) =>
        current.map(p => p.id === editData.id ? { ...p, name: original.name, quantity: original.quantity, unit: original.unit, category: original.category, note: original.note, updatedBy: original.updatedBy, editHistory: original.editHistory } : p)
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [showEdit, originalEditProduct, hasProductChanges, list.id, user.name, onUpdateProductsForList, showToast, t, setShowEdit, setOriginalEditProduct]);

  // ===== איפוס רשימה (החזרת כל המוצרים ל"לא נקנה") - כרטיס בתוך מודאל הניקוי =====
  const handleResetList = useCallback(async () => {
    if (!productsRef.current.some(p => p.isPurchased)) return;
    setShowClearList(false);
    // snapshot נוכחי של מוצרים שנקנו (מה-ref, לא מ-closure ישן)
    const purchasedIds = new Set(productsRef.current.filter(p => p.isPurchased).map(p => p.id));
    haptic('medium');
    onUpdateProductsForList(list.id, (current) =>
      current.map(p => p.isPurchased ? { ...p, isPurchased: false } : p)
    );
    try {
      await productsApi.resetProducts(list.id);
      trackEvent('list_reset'); // רשימה חוזרת - אינדיקציה חזקה ל-retention
      showToast(t('listReset'), 'success');
    } catch (error) {
      if (isNetworkError(error)) {
        // הסטייט האופטימיסטי (האיפוס) כבר הוחל - נשאר ככה, מסתנכרן בחזרה לרשת
        void enqueueReset(list.id);
        return;
      }
      onUpdateProductsForList(list.id, (current) =>
        current.map(p => purchasedIds.has(p.id) ? { ...p, isPurchased: true } : p)
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, onUpdateProductsForList, showToast, t, productsRef]);

  return {
    toggleProduct,
    deleteProduct,
    saveEditedProduct,
    showClearList,
    setShowClearList,
    handleClearList,
    handleResetList,
  };
};
