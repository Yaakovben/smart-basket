import { useState, useCallback, useMemo } from 'react';
import type { Product } from '../../../global/types';
import { useSettings } from '../../../global/context/SettingsContext';
import { newProductSchema, validateForm } from '../../../global/validation';
import { getDefaultNewProduct } from '../helpers/list-helpers';
import type { NewProductForm } from '../types/list-types';

// מצב הטופס של הוספה/עריכה של מוצר: ערכי השדות, ולידציה, ומטפלי עדכון.
// לא כולל קריאות שרת - אלה נמצאות ב-useAddProduct וב-useProductMutations.
export const useProductForm = () => {
  const { t } = useSettings();

  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductForm>(() => getDefaultNewProduct());
  const [addError, setAddError] = useState('');

  const [showEdit, setShowEdit] = useState<Product | null>(null);
  const [originalEditProduct, setOriginalEditProduct] = useState<Product | null>(null);

  // זיהוי שינויים בטופס עריכה
  const hasProductChanges = useMemo(() => {
    if (!showEdit || !originalEditProduct) return false;
    return (
      showEdit.name !== originalEditProduct.name ||
      showEdit.quantity !== originalEditProduct.quantity ||
      showEdit.unit !== originalEditProduct.unit ||
      showEdit.category !== originalEditProduct.category ||
      (showEdit.note || '') !== (originalEditProduct.note || '') ||
      (showEdit.image || '') !== (originalEditProduct.image || '')
    );
  }, [showEdit, originalEditProduct]);

  const validateProduct = useCallback((): boolean => {
    const result = validateForm(newProductSchema, {
      name: newProduct.name.trim(),
      quantity: newProduct.quantity,
      unit: newProduct.unit,
      category: newProduct.category
    });
    if (!result.success) {
      setAddError(t(result.error as Parameters<typeof t>[0]));
      return false;
    }
    return true;
  }, [newProduct, t]);

  const openEditProduct = useCallback((product: Product) => {
    setShowEdit({ ...product });
    setOriginalEditProduct({ ...product });
  }, []);

  const closeEditProduct = useCallback(() => {
    setShowEdit(null);
    setOriginalEditProduct(null);
  }, []);

  const updateNewProductField = useCallback(<K extends keyof NewProductForm>(
    field: K,
    value: NewProductForm[K]
  ) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
    if (field === 'name') setAddError('');
  }, []);

  const updateEditProductField = useCallback(<K extends keyof Product>(
    field: K,
    value: Product[K]
  ) => {
    setShowEdit(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const incrementQuantity = useCallback((type: 'new' | 'edit') => {
    if (type === 'new') {
      setNewProduct(prev => ({ ...prev, quantity: prev.quantity + 1 }));
    } else {
      setShowEdit(prev => prev ? { ...prev, quantity: prev.quantity + 1 } : null);
    }
  }, []);

  const decrementQuantity = useCallback((type: 'new' | 'edit') => {
    if (type === 'new') {
      setNewProduct(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }));
    } else {
      setShowEdit(prev => prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : null);
    }
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAdd(false);
    setAddError('');
  }, []);

  return {
    showAdd, setShowAdd,
    newProduct, setNewProduct,
    addError, setAddError,
    showEdit, setShowEdit,
    originalEditProduct, setOriginalEditProduct,
    hasProductChanges,
    validateProduct,
    openEditProduct,
    closeEditProduct,
    updateNewProductField,
    updateEditProductField,
    incrementQuantity,
    decrementQuantity,
    closeAddModal,
  };
};
