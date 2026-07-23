import { useState, useCallback, type RefObject } from 'react';
import type { Product, List, User, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { detectCategory } from '../../../global/helpers/categoryDetector';
import { convertApiProduct } from '../../../global/hooks';
import { productsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { getDefaultNewProduct } from '../helpers/list-helpers';
import type { NewProductForm } from '../types/list-types';

interface UseAddProductParams {
  list: List;
  user: User;
  onUpdateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  t: (key: TranslationKeys) => string;
  productsRef: RefObject<Product[]>;
  pendingTempActions: RefObject<Map<string, 'toggle'>>;
  newProduct: NewProductForm;
  setNewProduct: (data: NewProductForm) => void;
  setShowAdd: (show: boolean) => void;
  setAddError: (error: string) => void;
  setOpenItemId: (id: string | null) => void;
  validateProduct: () => boolean;
}

// הוספת מוצרים לרשימה: הוספה אופטימיסטית עם מזהה זמני, זיהוי כפילויות,
// והוספה מהירה (Quick Add).
export const useAddProduct = ({
  list,
  user,
  onUpdateProductsForList,
  showToast,
  t,
  productsRef,
  pendingTempActions,
  newProduct,
  setNewProduct,
  setShowAdd,
  setAddError,
  setOpenItemId,
  validateProduct,
}: UseAddProductParams) => {
  const [duplicateProduct, setDuplicateProduct] = useState<{ existing: Product; newData: { name: string; quantity: number; unit: Product['unit']; category: Product['category'] } } | null>(null);

  // הוספת מוצר - אופטימיסטי עם מזהה זמני
  const addProductToServer = useCallback(async (productData: {
    name: string;
    quantity: number;
    unit: Product['unit'];
    category: Product['category'];
    note?: string;
  }, showToastOnAdd = true) => {
    setOpenItemId(null);

    // הוספה אופטימיסטית מיידית עם מזהה זמני
    const tempId = `temp-${Date.now()}`;
    const tempProduct: Product = {
      id: tempId,
      name: productData.name,
      quantity: productData.quantity,
      unit: productData.unit,
      category: productData.category,
      isPurchased: false,
      addedBy: user.name,
      createdAt: new Date().toISOString(),
      note: productData.note,
    };
    onUpdateProductsForList(list.id, (current) => [...current, tempProduct]);

    try {
      const addedProduct = await productsApi.addProduct(list.id, productData);
      const realId = addedProduct.id;

      // החלפת מזהה זמני במזהה אמיתי מהשרת
      onUpdateProductsForList(list.id, (current) =>
        current.map(p => p.id === tempId ? convertApiProduct(addedProduct) : p)
      );

      socketService.emitProductAdded(list.id, {
        id: realId,
        name: addedProduct.name,
        quantity: addedProduct.quantity,
        unit: addedProduct.unit,
        category: addedProduct.category,
      }, user.name);

      if (showToastOnAdd) {
        showToast(t('added'));
      }

      // ביצוע פעולות שהמתינו למזהה אמיתי
      const pendingAction = pendingTempActions.current.get(tempId);
      if (pendingAction) {
        pendingTempActions.current.delete(tempId);
        if (pendingAction === 'toggle') {
          try {
            await productsApi.updateProduct(list.id, realId, { isPurchased: true });
            socketService.emitProductToggled(list.id, realId, addedProduct.name, true, user.name);
          } catch {
            // שחזור הסימון
            onUpdateProductsForList(list.id, (current) =>
              current.map(p => p.id === realId ? { ...p, isPurchased: false } : p)
            );
          }
        }
      }
    } catch (error) {
      // שחזור - הסרת המוצר הזמני
      if (import.meta.env.DEV) console.error('Failed to add product:', error);
      pendingTempActions.current.delete(tempId);
      onUpdateProductsForList(list.id, (current) =>
        current.filter(p => p.id !== tempId)
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, user.name, onUpdateProductsForList, showToast, t, setOpenItemId, pendingTempActions]);

  // בדיקת כפילות מוצר
  const checkDuplicate = useCallback((name: string): Product | undefined => {
    return productsRef.current.find(
      (p: Product) => p.name.trim().toLowerCase() === name.toLowerCase() && !p.isPurchased
    );
  }, [productsRef]);

  const handleAdd = useCallback(async () => {
    setAddError('');
    if (!validateProduct()) return;

    const productData = {
      name: newProduct.name.trim(),
      quantity: newProduct.quantity,
      unit: newProduct.unit,
      // זיהוי אוטומטי אם המשתמש לא בחר קטגוריה
      category: newProduct.category === 'אחר' as Product['category']
        ? detectCategory(newProduct.name.trim()) as Product['category']
        : newProduct.category,
      note: newProduct.note.trim() || undefined,
    };

    // בדיקת כפילות
    const existing = checkDuplicate(productData.name);
    if (existing) {
      setNewProduct(getDefaultNewProduct());
      setShowAdd(false);
      setDuplicateProduct({ existing, newData: productData });
      return;
    }

    // סגירת מודאל מיידית ואיפוס הטופס
    setNewProduct(getDefaultNewProduct());
    setShowAdd(false);

    // שליחה לשרת - המוצר יופיע רק אחרי אישור
    await addProductToServer(productData);
  }, [newProduct, validateProduct, addProductToServer, checkDuplicate, setNewProduct, setShowAdd, setAddError]);

  const handleQuickAdd = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    const category = detectCategory(trimmedName) as Product['category'];

    const existing = checkDuplicate(trimmedName);
    if (existing) {
      setDuplicateProduct({
        existing,
        newData: { name: trimmedName, quantity: 1, unit: 'יח׳' as Product['unit'], category }
      });
      return;
    }

    await addProductToServer({
      name: trimmedName,
      quantity: 1,
      unit: 'יח׳' as Product['unit'],
      category,
    });
  }, [addProductToServer, checkDuplicate]);

  // טיפול בכפילות - הגדלת כמות (אופטימיסטי)
  const handleDuplicateIncreaseQuantity = useCallback(async () => {
    if (!duplicateProduct) return;
    const { existing, newData } = duplicateProduct;
    const newQuantity = existing.quantity + newData.quantity;

    // עדכון אופטימיסטי מיידי
    setDuplicateProduct(null);
    onUpdateProductsForList(list.id, (currentProducts) =>
      currentProducts.map((p: Product) =>
        p.id === existing.id ? { ...p, quantity: newQuantity } : p
      )
    );

    try {
      await productsApi.updateProduct(list.id, existing.id, { quantity: newQuantity });
      showToast(t('updated'));
      socketService.emitProductUpdated(list.id, {
        id: existing.id,
        name: existing.name,
        quantity: newQuantity,
        unit: existing.unit,
        category: existing.category,
      }, user.name);
    } catch {
      // שחזור במקרה של שגיאה
      onUpdateProductsForList(list.id, (currentProducts) =>
        currentProducts.map((p: Product) =>
          p.id === existing.id ? { ...p, quantity: existing.quantity } : p
        )
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [duplicateProduct, list.id, user.name, onUpdateProductsForList, showToast, t]);

  // טיפול בכפילות - הוספה בכל זאת
  const handleDuplicateAddNew = useCallback(async () => {
    if (!duplicateProduct) return;
    const { newData } = duplicateProduct;
    setDuplicateProduct(null);
    await addProductToServer(newData);
  }, [duplicateProduct, addProductToServer]);

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateProduct(null);
  }, []);

  return {
    duplicateProduct,
    addProductToServer,
    checkDuplicate,
    handleAdd,
    handleQuickAdd,
    handleDuplicateIncreaseQuantity,
    handleDuplicateAddNew,
    handleDuplicateCancel,
  };
};
