import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Product, List, User, Member, ToastType } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDebounce, convertApiProduct, convertApiList } from '../../../global/hooks';
import { StorageService } from '../../../global/services/storage';
import { newProductSchema, validateForm } from '../../../global/validation';
import { productsApi, listsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import type {
  NewProductForm,
  EditListForm,
  ConfirmState,
  FabPosition,
  DragState,
  ListFilter,
  UseListReturn
} from '../types/list-types';

// ===== קבועים =====
const FAB_VISIBILITY_THRESHOLD = 3; // מוסתר כשפחות מ-3 מוצרים
const FAB_BOUNDARY = { minX: 30, minY: 50, bottomOffset: 30 }; // גבולות גרירה בפיקסלים
const DEFAULT_FAB_BOTTOM_OFFSET = 90; // מיקום ברירת מחדל מתחתית המסך

// מזהה זמני למוצרים שעדיין לא אושרו מהשרת
const isTempId = (id: string) => id.startsWith('temp-');

const getDefaultNewProduct = (): NewProductForm => ({
  name: '',
  quantity: 1,
  unit: 'יח׳' as Product['unit'],
  category: 'אחר' as Product['category'],
});

// ===== טיפוסים =====
interface UseListParams {
  list: List;
  user: User;
  onUpdateList: (list: List) => void | Promise<void>;
  onUpdateListLocal: (list: List) => void;
  onUpdateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  onLeaveList: (listId: string) => void | Promise<void>;
  onDeleteList: (listId: string) => void | Promise<void>;
  onBack: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export const useList = ({
  list,
  user,
  onUpdateList,
  onUpdateListLocal,
  onUpdateProductsForList,
  onLeaveList,
  onDeleteList,
  onBack,
  showToast
}: UseListParams): UseListReturn => {
  const { t } = useSettings();

  // ===== מצב חיפוש וסינון =====
  const [filter, setFilter] = useState<ListFilter>('pending');
  const [search, setSearch] = useState('');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => !StorageService.isHintSeen());

  // ===== מצב נראות מודאלים =====
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Product | null>(null);
  const [originalEditProduct, setOriginalEditProduct] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState<Product | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showShareList, setShowShareList] = useState(false);
  const [showEditList, setShowEditList] = useState(false);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // ===== מצב טופס =====
  const [newProduct, setNewProduct] = useState<NewProductForm>(() => getDefaultNewProduct());
  const [editListData, setEditListData] = useState<EditListForm | null>(null);
  const [addError, setAddError] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<{ existing: Product; newData: { name: string; quantity: number; unit: Product['unit']; category: Product['category'] } } | null>(null);

  // ===== חגיגת השלמת רשימה =====
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // דגל שמסמן שהמשתמש סימן מוצר כנקנה (לזיהוי חגיגה ב-useEffect)
  const justMarkedPurchased = useRef(false);

  // ===== מצב גרירת FAB =====
  const [fabPosition, setFabPosition] = useState<FabPosition | null>(() => {
    try {
      const saved = localStorage.getItem('fab-position');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  // ===== מניעת תנאי מרוץ =====
  // תור פעולות ממתינות למוצרים עם מזהה זמני
  const pendingTempActions = useRef(new Map<string, 'toggle'>());

  const productsRef = useRef(list.products);
  productsRef.current = list.products;

  // ===== ערכים מחושבים =====
  const pending = useMemo(
    () => list.products.filter((p: Product) => !p.isPurchased),
    [list.products]
  );

  const purchased = useMemo(
    () => list.products.filter((p: Product) => p.isPurchased),
    [list.products]
  );

  // Debounce לחיפוש
  const debouncedSearch = useDebounce(search, 300);

  const items = useMemo(
    () => (filter === 'pending' ? pending : purchased).filter((p: Product) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [filter, pending, purchased, debouncedSearch]
  );

  const allMembers = useMemo(
    () => [list.owner, ...list.members],
    [list.owner, list.members]
  );

  const isOwner = useMemo(
    () => list.owner.id === user.id,
    [list.owner.id, user.id]
  );

  // זיהוי שינויים
  const hasProductChanges = useMemo(() => {
    if (!showEdit || !originalEditProduct) return false;
    return (
      showEdit.name !== originalEditProduct.name ||
      showEdit.quantity !== originalEditProduct.quantity ||
      showEdit.unit !== originalEditProduct.unit ||
      showEdit.category !== originalEditProduct.category
    );
  }, [showEdit, originalEditProduct]);

  const hasListChanges = useMemo(() => {
    if (!editListData) return false;
    return (
      editListData.name !== list.name ||
      editListData.icon !== list.icon ||
      editListData.color !== list.color
    );
  }, [editListData, list.name, list.icon, list.color]);

  // ===== אפקטים =====
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- הסתרת FAB כשמספר הפריטים קטן
    if (items.length <= FAB_VISIBILITY_THRESHOLD) setFabPosition(null);
  }, [items.length]);

  useEffect(() => () => clearTimeout(celebrationTimer.current), []);

  // זיהוי חגיגה: כל המוצרים נקנו + המשתמש זה עתה סימן מוצר
  useEffect(() => {
    if (!justMarkedPurchased.current) return;
    // איפוס הדגל תמיד כדי למנוע הפעלה שגויה מאירועי socket
    justMarkedPurchased.current = false;
    if (
      list.products.length > 0 &&
      list.products.every((p: Product) => p.isPurchased)
    ) {
      clearTimeout(celebrationTimer.current);
      setShowCelebration(true);
      haptic('heavy');
      celebrationTimer.current = setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [list.products]);

  // ===== מטפלי גרירת FAB =====
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    const currentX = fabPosition?.x ?? window.innerWidth / 2;
    const currentY = fabPosition?.y ?? window.innerHeight - DEFAULT_FAB_BOTTOM_OFFSET;
    dragRef.current = { startX: clientX, startY: clientY, startPosX: currentX, startPosY: currentY };
    setIsDragging(true);
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !isDragging) return;
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;
    const newX = Math.max(FAB_BOUNDARY.minX, Math.min(window.innerWidth - FAB_BOUNDARY.minX, dragRef.current.startPosX + deltaX));
    const newY = Math.max(FAB_BOUNDARY.minY, Math.min(window.innerHeight - FAB_BOUNDARY.bottomOffset, dragRef.current.startPosY + deltaY));
    setFabPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
    // שמירת מיקום FAB ב-localStorage
    if (fabPosition) {
      try { localStorage.setItem('fab-position', JSON.stringify(fabPosition)); } catch {}
    }
  }, [fabPosition]);

  // ===== מטפל רמז =====
  const dismissHint = useCallback(() => {
    setShowHint(false);
    StorageService.markHintSeen();
  }, []);

  // ===== מטפלי מוצרים =====
  // עדכון מקומי (לא קורא ל-API), משתמש ב-functional updater למניעת stale closures
  const updateProducts = useCallback((products: Product[]) => {
    onUpdateProductsForList(list.id, () => products);
  }, [list.id, onUpdateProductsForList]);

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

  // הוספת מוצר - אופטימיסטי עם מזהה זמני
  const addProductToServer = useCallback(async (productData: {
    name: string;
    quantity: number;
    unit: Product['unit'];
    category: Product['category'];
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
  }, [list.id, user.name, onUpdateProductsForList, showToast, t]);

  // בדיקת כפילות מוצר
  const checkDuplicate = useCallback((name: string): Product | undefined => {
    return productsRef.current.find(
      (p: Product) => p.name.trim().toLowerCase() === name.toLowerCase() && !p.isPurchased
    );
  }, []);

  const handleAdd = useCallback(async () => {
    setAddError('');
    if (!validateProduct()) return;

    const productData = {
      name: newProduct.name.trim(),
      quantity: newProduct.quantity,
      unit: newProduct.unit,
      category: newProduct.category,
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
  }, [newProduct, validateProduct, addProductToServer, checkDuplicate]);

  const handleQuickAdd = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    // בדיקת כפילות
    const existing = checkDuplicate(trimmedName);
    if (existing) {
      setDuplicateProduct({
        existing,
        newData: { name: trimmedName, quantity: 1, unit: 'יח׳' as Product['unit'], category: 'אחר' as Product['category'] }
      });
      return;
    }

    await addProductToServer({
      name: trimmedName,
      quantity: 1,
      unit: 'יח׳' as Product['unit'],
      category: 'אחר' as Product['category'],
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

  const toggleProduct = useCallback(async (productId: string) => {
    const product = productsRef.current.find((p: Product) => p.id === productId);
    if (!product) return;

    const newIsPurchased = !product.isPurchased;
    dismissHint();

    // עדכון אופטימיסטי מיידי
    if (newIsPurchased) {
      justMarkedPurchased.current = true;
    }
    onUpdateProductsForList(list.id, (currentProducts) =>
      currentProducts.map((p: Product) =>
        p.id === productId ? { ...p, isPurchased: newIsPurchased } : p
      )
    );

    // מוצר עם מזהה זמני: שמירת הפעולה בתור, תישלח לשרת אחרי קבלת מזהה אמיתי
    if (isTempId(productId)) {
      pendingTempActions.current.set(productId, 'toggle');
      return;
    }

    try {
      await productsApi.updateProduct(list.id, productId, { isPurchased: newIsPurchased });
      socketService.emitProductToggled(list.id, productId, product.name, newIsPurchased, user.name);
      showToast(t(newIsPurchased ? 'markedAsPurchased' : 'markedAsNotPurchased'), 'success');
    } catch (error) {
      // שחזור במקרה של שגיאה
      if (import.meta.env.DEV) console.error('Failed to toggle product:', { productId, listId: list.id, error });
      onUpdateProductsForList(list.id, (currentProducts) =>
        currentProducts.map((p: Product) =>
          p.id === productId ? { ...p, isPurchased: product.isPurchased } : p
        )
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, user.name, onUpdateProductsForList, showToast, t, dismissHint]);

  const deleteProduct = useCallback((productId: string) => {
    if (isTempId(productId)) return; // מוצר עדיין לא אושר מהשרת
    const product = list.products.find((p: Product) => p.id === productId);
    if (!product) return;

    setConfirm({
      title: t('deleteProduct'),
      message: `${t('delete')} "${product.name}"?`,
      onConfirm: async () => {
        setConfirm(null);
        // מניעת חגיגה שגויה - מחיקה לא נחשבת כסימון נקנה
        justMarkedPurchased.current = false;

        // מחיקה אופטימיסטית מיידית
        onUpdateProductsForList(list.id, (current) =>
          current.filter(p => p.id !== productId)
        );

        try {
          await productsApi.deleteProduct(list.id, productId);
          showToast(t('deleted'));
          socketService.emitProductDeleted(list.id, productId, product.name, user.name);
        } catch (error) {
          // שחזור במקרה של שגיאה
          if (import.meta.env.DEV) console.error('Failed to delete product:', error);
          onUpdateProductsForList(list.id, (current) => [...current, product]);
          showToast(t('errorOccurred'), 'error');
        }
      }
    });
  }, [list.id, list.products, user.name, onUpdateProductsForList, showToast, t]);

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
    justMarkedPurchased.current = false;

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
      // עדכון חברי קבוצה דרך socket
      affectedItems.forEach(p => {
        socketService.emitProductDeleted(list.id, p.id, p.name, user.name);
      });
      showToast(t('listCleared'), 'success');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to clear list:', error);
      // שחזור
      onUpdateProductsForList(list.id, (current) => [...current, ...affectedItems]);
      showToast(t('errorOccurred'), 'error');
    }
  }, [list.id, list.products, user.name, onUpdateProductsForList, showToast, t]);

  const saveEditedProduct = useCallback(async () => {
    if (!showEdit || !originalEditProduct || !hasProductChanges) return;
    if (isTempId(showEdit.id)) return; // מוצר עדיין לא אושר מהשרת
    haptic('medium');

    const editData = { ...showEdit };
    const original = { ...originalEditProduct };

    // בניית diff - שליחת שדות שהשתנו בלבד
    const changes: Record<string, unknown> = {};
    if (editData.name !== original.name) changes.name = editData.name;
    if (editData.quantity !== original.quantity) changes.quantity = editData.quantity;
    if (editData.unit !== original.unit) changes.unit = editData.unit;
    if (editData.category !== original.category) changes.category = editData.category;

    // עדכון אופטימיסטי - סגירת מודאל ועדכון UI מיידי
    setShowEdit(null);
    setOriginalEditProduct(null);
    onUpdateProductsForList(list.id, (current) =>
      current.map(p => p.id === editData.id ? { ...p, name: editData.name, quantity: editData.quantity, unit: editData.unit, category: editData.category } : p)
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
      // שחזור במקרה של שגיאה
      if (import.meta.env.DEV) console.error('Failed to update product:', error);
      onUpdateProductsForList(list.id, (current) =>
        current.map(p => p.id === editData.id ? { ...p, name: original.name, quantity: original.quantity, unit: original.unit, category: original.category } : p)
      );
      showToast(t('errorOccurred'), 'error');
    }
  }, [showEdit, originalEditProduct, hasProductChanges, list.id, user.name, onUpdateProductsForList, showToast, t]);

  const openEditProduct = useCallback((product: Product) => {
    if (isTempId(product.id)) return; // מוצר עדיין לא אושר מהשרת
    setShowEdit({ ...product });
    setOriginalEditProduct({ ...product });
  }, []);

  const closeEditProduct = useCallback(() => {
    setShowEdit(null);
    setOriginalEditProduct(null);
  }, []);

  // ===== מטפלי עדכון טופס =====
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
    } else if (showEdit) {
      setShowEdit(prev => prev ? { ...prev, quantity: prev.quantity + 1 } : null);
    }
  }, [showEdit]);

  const decrementQuantity = useCallback((type: 'new' | 'edit') => {
    if (type === 'new') {
      setNewProduct(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }));
    } else if (showEdit) {
      setShowEdit(prev => prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : null);
    }
  }, [showEdit]);

  const closeAddModal = useCallback(() => {
    setShowAdd(false);
    setAddError('');
  }, []);

  // ===== מטפלי עריכת רשימה =====
  const handleEditList = useCallback(() => {
    setEditListData({ name: list.name, icon: list.icon, color: list.color });
    setShowEditList(true);
  }, [list.name, list.icon, list.color]);

  const saveListChanges = useCallback(async () => {
    if (!editListData || !hasListChanges) return;
    const oldData = { name: list.name, icon: list.icon, color: list.color };

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

  // ===== מטפלי חברים =====
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
  }, [list, user.name, onUpdateListLocal, showToast, t]);

  const leaveList = useCallback(() => {
    setConfirm({
      title: t('leaveGroup'),
      message: t('leaveGroupConfirm'),
      onConfirm: async () => {
        await onLeaveList(list.id);
        setConfirm(null);
      }
    });
  }, [list.id, onLeaveList, t]);

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
    filter,
    search,
    showAdd,
    showEdit,
    showDetails,
    showInvite,
    showMembers,
    showShareList,
    showEditList,
    editListData,
    confirmDeleteList,
    confirm,
    newProduct,
    openItemId,
    showHint,
    addError,
    refreshing,
    fabPosition,
    isDragging,

    pending,
    purchased,
    items,
    allMembers,
    isOwner,
    hasProductChanges,
    hasListChanges,

    setFilter,
    setSearch,
    setShowAdd,
    setShowEdit,
    setShowDetails,
    setShowInvite,
    setShowMembers,
    setShowShareList,
    setShowEditList,
    setEditListData,
    setConfirmDeleteList,
    setConfirm,
    setNewProduct,
    setOpenItemId,
    setAddError,

    handleDragStart,
    handleDragMove,
    handleDragEnd,
    dismissHint,
    handleAdd,
    handleQuickAdd,
    handleEditList,
    saveListChanges,
    handleDeleteList,
    removeMember,
    leaveList,
    updateProducts,
    toggleProduct,
    deleteProduct,
    saveEditedProduct,
    openEditProduct,
    closeEditProduct,
    updateNewProductField,
    updateEditProductField,
    incrementQuantity,
    decrementQuantity,
    closeAddModal,
    duplicateProduct,
    handleDuplicateIncreaseQuantity,
    handleDuplicateAddNew,
    handleDuplicateCancel,
    refreshList,
    showClearList,
    setShowClearList,
    handleClearList,
    showCelebration
  };
};
