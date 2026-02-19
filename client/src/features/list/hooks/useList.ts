import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Product, List, User, Member, ToastType } from '../../../global/types';
import { haptic, getLocale } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDebounce } from '../../../global/hooks';
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

// המרת מוצר API לטיפוס מוצר קליינט
const convertApiProduct = (apiProduct: { id: string; name: string; quantity: number; unit: string; category: string; isPurchased: boolean; addedBy: string; createdAt: string }, locale: string): Product => ({
  id: apiProduct.id,
  name: apiProduct.name,
  quantity: apiProduct.quantity,
  unit: apiProduct.unit as Product['unit'],
  category: apiProduct.category as Product['category'],
  isPurchased: apiProduct.isPurchased,
  addedBy: apiProduct.addedBy,
  createdDate: new Date(apiProduct.createdAt).toLocaleDateString(locale),
  createdTime: new Date(apiProduct.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
});

// ===== קבועים =====
const FAB_VISIBILITY_THRESHOLD = 3;
const FAB_BOUNDARY = { minX: 30, minY: 50, bottomOffset: 30 };
const DEFAULT_FAB_BOTTOM_OFFSET = 90;

const getDefaultNewProduct = (): NewProductForm => ({
  name: '',
  quantity: 1,
  unit: 'יח׳' as Product['unit'],
  category: 'אחר' as Product['category'],
});

// יצירת מחרוזות תאריך/שעה
const createDateTimeStrings = (locale: string) => {
  const now = new Date();
  return {
    createdDate: now.toLocaleDateString(locale),
    createdTime: now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
  };
};

// ===== טיפוסים =====
interface UseListParams {
  list: List;
  user: User;
  onUpdateList: (list: List) => void;
  onUpdateListLocal: (list: List) => void;
  onUpdateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
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
  const { t, settings } = useSettings();
  const locale = getLocale(settings.language);

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

  // ===== מצב גרירת FAB =====
  const [fabPosition, setFabPosition] = useState<FabPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  // ===== מניעת תנאי מרוץ ב-toggle =====
  const toggleVersions = useRef(new Map<string, number>());
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: hide FAB when items count drops
    if (items.length <= FAB_VISIBILITY_THRESHOLD) setFabPosition(null);
  }, [items.length]);

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
  }, []);

  // ===== מטפל רמז =====
  const dismissHint = useCallback(() => {
    setShowHint(false);
    StorageService.markHintSeen();
  }, []);

  // ===== מטפלי מוצרים =====
  // עדכון אופטימיסטי (לא קורא ל-API)
  const updateProducts = useCallback((products: Product[]) => {
    onUpdateListLocal({ ...list, products });
  }, [list, onUpdateListLocal]);

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

  // עזר משותף להוספת מוצרים עם עדכון אופטימיסטי
  // אם false, הקורא אחראי להצגת toast
  const addProductWithOptimisticUpdate = useCallback(async (productData: {
    name: string;
    quantity: number;
    unit: Product['unit'];
    category: Product['category'];
  }, showToastOnAdd = true) => {
    setOpenItemId(null);

    // יצירת מוצר אופטימיסטי עם מזהה זמני
    const tempId = `temp_${Date.now()}`;
    const { createdDate, createdTime } = createDateTimeStrings(locale);
    const optimisticProduct: Product = {
      id: tempId,
      ...productData,
      isPurchased: false,
      addedBy: user.name,
      createdDate,
      createdTime,
      isPending: true,
    };

    // עדכון אופטימיסטי - הוספה ל-state הנוכחי (functional update למניעת stale closures)
    onUpdateProductsForList(list.id, (current) => [...current, optimisticProduct]);
    if (showToastOnAdd) {
      showToast(t('added'));
    }

    try {
      const addedProduct = await productsApi.addProduct(list.id, productData);

      // שליחת אירוע socket להתראת משתמשים אחרים
      socketService.emitProductAdded(list.id, {
        id: addedProduct.id,
        name: addedProduct.name,
        quantity: addedProduct.quantity,
        unit: addedProduct.unit,
        category: addedProduct.category,
      }, user.name);

      // החלפת המוצר הזמני בנתון האמיתי (שומר על מוצרים אופטימיסטיים אחרים שבהמתנה)
      onUpdateProductsForList(list.id, (current) =>
        current.map(p => p.id === tempId ? { ...convertApiProduct(addedProduct, locale), isPending: false } : p)
      );
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to add product:', error);
      // הסרת המוצר הזמני בלבד (לא פוגע במוצרים אופטימיסטיים אחרים שבהמתנה)
      onUpdateProductsForList(list.id, (current) =>
        current.filter(p => p.id !== tempId)
      );
      showToast(t('unknownError'), 'error');
    }
  }, [list.id, user.name, onUpdateProductsForList, showToast, t, locale]);

  const handleAdd = useCallback(() => {
    setAddError('');
    if (!validateProduct()) return;

    // סגירת מודאל מיידית
    const productData = {
      name: newProduct.name.trim(),
      quantity: newProduct.quantity,
      unit: newProduct.unit,
      category: newProduct.category,
    };
    setNewProduct(getDefaultNewProduct());
    setShowAdd(false);
    showToast(t('added'));

    // הוספה ברקע (עדכון אופטימיסטי כבר מציג)
    addProductWithOptimisticUpdate(productData, false);
  }, [newProduct, validateProduct, addProductWithOptimisticUpdate, showToast, t]);

  const handleQuickAdd = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    await addProductWithOptimisticUpdate({
      name: trimmedName,
      quantity: 1,
      unit: 'יח׳' as Product['unit'],
      category: 'אחר' as Product['category'],
    });
  }, [addProductWithOptimisticUpdate]);

  const toggleProduct = useCallback(async (productId: string) => {
    const product = list.products.find((p: Product) => p.id === productId);
    if (!product || product.isPending) return;

    const newIsPurchased = !product.isPurchased;

    // מעקב אחר toggles מקבילים למניעת תגובות מיושנות
    const version = (toggleVersions.current.get(productId) || 0) + 1;
    toggleVersions.current.set(productId, version);

    // עדכון אופטימיסטי - תגובה מיידית ב-UI
    updateProducts(
      list.products.map((p: Product) =>
        p.id === productId ? { ...p, isPurchased: newIsPurchased } : p
      )
    );
    showToast(t('updated'));
    dismissHint();

    try {
      await productsApi.updateProduct(list.id, productId, { isPurchased: newIsPurchased });

      // לא לדרוס עם תגובת שרת - סומכים על עדכון אופטימיסטי
      if (toggleVersions.current.get(productId) === version) {
        toggleVersions.current.delete(productId);
      }

      socketService.emitProductToggled(list.id, productId, product.name, newIsPurchased, user.name);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to toggle product:', error);
      // גלגול אחורה רק אם לא היה toggle חדש יותר
      if (toggleVersions.current.get(productId) === version) {
        updateProducts(
          productsRef.current.map((p: Product) =>
            p.id === productId ? { ...p, isPurchased: !newIsPurchased } : p
          )
        );
        showToast(t('unknownError'), 'error');
        toggleVersions.current.delete(productId);
      }
    }
  }, [list.id, list.products, user.name, updateProducts, showToast, t, dismissHint]);

  const deleteProduct = useCallback((productId: string) => {
    const product = list.products.find((p: Product) => p.id === productId);
    if (!product || product.isPending) return;

    setConfirm({
      title: t('deleteProduct'),
      message: `${t('delete')} "${product.name}"?`,
      onConfirm: () => {
        // סגירת מודאל מיידית + עדכון אופטימיסטי
        setConfirm(null);
        onUpdateProductsForList(list.id, (current) =>
          current.filter(p => p.id !== productId)
        );
        showToast(t('deleted'));

        // API ברקע
        productsApi.deleteProduct(list.id, productId).then(() => {
          socketService.emitProductDeleted(list.id, productId, product.name, user.name);
        }).catch((error) => {
          if (import.meta.env.DEV) console.error('Failed to delete product:', error);
          // גלגול אחורה - החזרת המוצר
          onUpdateProductsForList(list.id, (current) => [...current, product]);
          showToast(t('unknownError'), 'error');
        });
      }
    });
  }, [list.id, list.products, user.name, onUpdateProductsForList, showToast, t]);

  const saveEditedProduct = useCallback(async () => {
    if (!showEdit || !originalEditProduct || !hasProductChanges) return;
    haptic('medium');

    // שמירת נתוני עריכה לפני סגירת מודאל
    const editData = { ...showEdit };
    const original = { ...originalEditProduct };

    // סגירת מודאל מיידית
    setShowEdit(null);
    setOriginalEditProduct(null);

    // עדכון אופטימיסטי - מיידי ב-UI
    onUpdateProductsForList(list.id, (current) =>
      current.map(p => p.id === editData.id ? { ...p, name: editData.name, quantity: editData.quantity, unit: editData.unit, category: editData.category } : p)
    );
    showToast(t('saved'));

    // בניית diff - שליחת שדות שהשתנו בלבד
    const changes: Record<string, unknown> = {};
    if (editData.name !== original.name) changes.name = editData.name;
    if (editData.quantity !== original.quantity) changes.quantity = editData.quantity;
    if (editData.unit !== original.unit) changes.unit = editData.unit;
    if (editData.category !== original.category) changes.category = editData.category;

    // API ברקע
    productsApi.updateProduct(list.id, editData.id, changes).then(() => {
      socketService.emitProductUpdated(list.id, {
        id: editData.id,
        name: editData.name,
        quantity: editData.quantity,
        unit: editData.unit,
        category: editData.category,
      }, user.name);
    }).catch((error) => {
      if (import.meta.env.DEV) console.error('Failed to update product:', error);
      // גלגול אחורה - החזרת הנתונים המקוריים
      onUpdateProductsForList(list.id, (current) =>
        current.map(p => p.id === editData.id ? original : p)
      );
      showToast(t('unknownError'), 'error');
    });
  }, [showEdit, originalEditProduct, hasProductChanges, list.id, user.name, onUpdateProductsForList, showToast, t]);

  const openEditProduct = useCallback((product: Product) => {
    if (product.isPending) return;
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

  const saveListChanges = useCallback(() => {
    if (!editListData || !hasListChanges) return;
    onUpdateList({ ...list, ...editListData });
    setShowEditList(false);
    showToast(t('saved'));
  }, [list, editListData, hasListChanges, onUpdateList, showToast, t]);

  const handleDeleteList = useCallback(async () => {
    await onDeleteList(list.id);
    onBack();
  }, [list.id, onDeleteList, onBack]);

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
          showToast(t('unknownError'), 'error');
        }
        setConfirm(null);
      }
    });
  }, [list, user.name, onUpdateListLocal, showToast, t]);

  const leaveList = useCallback(() => {
    setConfirm({
      title: t('leaveGroup'),
      message: t('leaveGroupConfirm'),
      onConfirm: () => {
        onLeaveList(list.id);
        setConfirm(null);
      }
    });
  }, [list.id, onLeaveList, t]);

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
    closeAddModal
  };
};
