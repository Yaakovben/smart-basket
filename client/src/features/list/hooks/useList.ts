import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { Product, List, User, ToastType } from '../../../global/types';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDebounce } from '../../../global/hooks';
import { StorageService } from '../../../global/services/storage';
import { getCategoryOrder } from '../helpers/list-helpers';
import { useFabDrag } from './useFabDrag';
import { useCelebration } from './useCelebration';
import { useProductForm } from './useProductForm';
import { useAddProduct } from './useAddProduct';
import { useProductMutations } from './useProductMutations';
import { useListActions } from './useListActions';
import type {
  ConfirmState,
  ListFilter,
  UseListReturn
} from '../types/list-types';

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
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
}

// Hook מרכזי של דף הרשימה - מרכיב את כל תת-ה-hooks הייעודיים (טופס מוצר,
// הוספה, שינויי מצב, פעולות רשימה, גרירת FAB, חגיגה) ומחזיק state משותף
// שנחוץ לכמה תחומים בו-זמנית (חיפוש/סינון, מודאלים כלליים, דיאלוג אישור).
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

  // ===== מצב נראות מודאלים כלליים =====
  const [showDetails, setShowDetails] = useState<Product | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showShareList, setShowShareList] = useState(false);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // ===== מניעת תנאי מרוץ - refs משותפים בין הוספה לעדכון מוצרים =====
  // מסונכרן ב-effect (לא בזמן render) - נקרא רק מתוך callbacks/handlers
  // שרצים תמיד אחרי commit, כך שאין השהיה מעשית מול הגרסה הישנה שכתבה ל-ref בזמן render.
  const productsRef = useRef(list.products);
  useEffect(() => {
    productsRef.current = list.products;
  });
  // תור פעולות ממתינות למוצרים עם מזהה זמני
  const pendingTempActions = useRef(new Map<string, 'toggle'>());

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

  // רשימת המוצרים המוצגת ב-UI: מסוננת לפי חיפוש וממוינת לפי קטגוריה
  // (ירקות → פירות → חלב וכו' לפי זרימה טבעית של קניות).
  // בתוך אותה קטגוריה - מיון לפי שם לעקביות.
  const items = useMemo(() => {
    const source = filter === 'pending' ? pending : purchased;
    const needle = debouncedSearch.toLowerCase();
    const filtered = needle
      ? source.filter((p: Product) => p.name.toLowerCase().includes(needle))
      : source;
    // מיון יציב: קודם לפי קטגוריה (סדר קבוע), אח"כ לפי שם בסדר א"ב
    return [...filtered].sort((a, b) => {
      const diff = getCategoryOrder(a.category) - getCategoryOrder(b.category);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, 'he');
    });
  }, [filter, pending, purchased, debouncedSearch]);

  const allMembers = useMemo(
    () => [list.owner, ...list.members],
    [list.owner, list.members]
  );

  const isOwner = useMemo(
    () => list.owner.id === user.id,
    [list.owner.id, user.id]
  );

  // FAB מוצג תמיד, מיקום קבוע למטה שלא תלוי בתוכן הרשימה
  const showFab = true;

  // ===== מטפל רמז =====
  const dismissHint = useCallback(() => {
    setShowHint(false);
    StorageService.markHintSeen();
  }, []);

  // עדכון מקומי (לא קורא ל-API), משתמש ב-functional updater למניעת stale closures
  const updateProducts = useCallback((products: Product[]) => {
    onUpdateProductsForList(list.id, () => products);
  }, [list.id, onUpdateProductsForList]);

  // ===== הרכבת תת-ה-hooks =====
  const { fabPosition, isDragging, handleDragStart, handleDragMove, handleDragEnd } = useFabDrag();

  const { showCelebration, markPurchased, clearMarked } = useCelebration(list.products);

  const productForm = useProductForm();

  const {
    duplicateProduct,
    handleAdd,
    handleQuickAdd,
    handleDuplicateIncreaseQuantity,
    handleDuplicateAddNew,
    handleDuplicateCancel,
  } = useAddProduct({
    list,
    user,
    onUpdateProductsForList,
    showToast,
    t,
    productsRef,
    pendingTempActions,
    newProduct: productForm.newProduct,
    setNewProduct: productForm.setNewProduct,
    setShowAdd: productForm.setShowAdd,
    setAddError: productForm.setAddError,
    setOpenItemId,
    validateProduct: productForm.validateProduct,
  });

  const {
    toggleProduct,
    deleteProduct,
    saveEditedProduct,
    showClearList,
    setShowClearList,
    handleClearList,
    handleResetList,
  } = useProductMutations({
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
    showEdit: productForm.showEdit,
    setShowEdit: productForm.setShowEdit,
    originalEditProduct: productForm.originalEditProduct,
    setOriginalEditProduct: productForm.setOriginalEditProduct,
    hasProductChanges: productForm.hasProductChanges,
  });

  const {
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
  } = useListActions({
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
  });

  return {
    filter,
    search,
    showAdd: productForm.showAdd,
    showEdit: productForm.showEdit,
    showDetails,
    showInvite,
    showMembers,
    showShareList,
    showEditList,
    editListData,
    confirmDeleteList,
    confirm,
    newProduct: productForm.newProduct,
    openItemId,
    showHint,
    addError: productForm.addError,
    refreshing,
    fabPosition,
    showFab,
    isDragging,

    pending,
    purchased,
    items,
    allMembers,
    isOwner,
    hasProductChanges: productForm.hasProductChanges,
    hasListChanges,

    setFilter,
    setSearch,
    setShowAdd: productForm.setShowAdd,
    setShowEdit: productForm.setShowEdit,
    setShowDetails,
    setShowInvite,
    setShowMembers,
    setShowShareList,
    setShowEditList,
    setEditListData,
    setConfirmDeleteList,
    setConfirm,
    setNewProduct: productForm.setNewProduct,
    setOpenItemId,
    setAddError: productForm.setAddError,

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
    openEditProduct: productForm.openEditProduct,
    closeEditProduct: productForm.closeEditProduct,
    updateNewProductField: productForm.updateNewProductField,
    updateEditProductField: productForm.updateEditProductField,
    incrementQuantity: productForm.incrementQuantity,
    decrementQuantity: productForm.decrementQuantity,
    closeAddModal: productForm.closeAddModal,
    duplicateProduct,
    handleDuplicateIncreaseQuantity,
    handleDuplicateAddNew,
    handleDuplicateCancel,
    refreshList,
    showClearList,
    setShowClearList,
    handleClearList,
    handleResetList,
    showCelebration
  };
};
