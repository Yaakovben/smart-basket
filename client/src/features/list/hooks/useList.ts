import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Product, List, User, Member } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDebounce } from '../../../global/hooks';
import { StorageService } from '../../../global/services/storage';
import { formatDate, formatTime, generateProductId } from '../helpers/list-helpers';
import { newProductSchema, validateForm } from '../../../global/validation';
import type {
  NewProductForm,
  EditListForm,
  ConfirmState,
  FabPosition,
  DragState,
  ListFilter,
  UseListReturn
} from '../types/list-types';

// ===== Constants =====
const FAB_VISIBILITY_THRESHOLD = 3;
const FAB_BOUNDARY = { minX: 30, minY: 50, bottomOffset: 30 };
const DEFAULT_FAB_BOTTOM_OFFSET = 90;

const DEFAULT_NEW_PRODUCT: NewProductForm = {
  name: '',
  quantity: 1,
  unit: 'יח׳',
  category: 'אחר'
};

// ===== Types =====
interface UseListParams {
  list: List;
  user: User;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onBack: () => void;
  showToast: (message: string) => void;
}

export const useList = ({
  list,
  user,
  onUpdateList,
  onLeaveList,
  onDeleteList,
  onBack,
  showToast
}: UseListParams): UseListReturn => {
  const { t } = useSettings();

  // ===== Filter & Search State =====
  const [filter, setFilter] = useState<ListFilter>('pending');
  const [search, setSearch] = useState('');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => !StorageService.isHintSeen());

  // ===== Modal Visibility State =====
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

  // ===== Form State =====
  const [newProduct, setNewProduct] = useState<NewProductForm>(DEFAULT_NEW_PRODUCT);
  const [editListData, setEditListData] = useState<EditListForm | null>(null);
  const [addError, setAddError] = useState('');

  // ===== FAB Drag State =====
  const [fabPosition, setFabPosition] = useState<FabPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  // ===== Computed Values =====
  const pending = useMemo(
    () => list.products.filter((p: Product) => !p.isPurchased),
    [list.products]
  );

  const purchased = useMemo(
    () => list.products.filter((p: Product) => p.isPurchased),
    [list.products]
  );

  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 300);

  const items = useMemo(
    () => (filter === 'pending' ? pending : purchased).filter((p: Product) => p.name.includes(debouncedSearch)),
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

  // Change detection
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

  // ===== Effects =====
  useEffect(() => {
    if (items.length <= FAB_VISIBILITY_THRESHOLD) setFabPosition(null);
  }, [items.length]);

  // ===== FAB Drag Handlers =====
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

  // ===== Hint Handler =====
  const dismissHint = useCallback(() => {
    setShowHint(false);
    StorageService.markHintSeen();
  }, []);

  // ===== Product Handlers =====
  const updateProducts = useCallback((products: Product[]) => {
    onUpdateList({ ...list, products });
  }, [list, onUpdateList]);

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

  const handleAdd = useCallback(() => {
    setAddError('');
    if (!validateProduct()) return;

    setOpenItemId(null);
    const product: Product = {
      id: generateProductId(),
      ...newProduct,
      isPurchased: false,
      addedBy: user.name,
      createdDate: formatDate(),
      createdTime: formatTime()
    };

    updateProducts([...list.products, product]);
    setNewProduct(DEFAULT_NEW_PRODUCT);
    setShowAdd(false);
    showToast(t('added'));
  }, [newProduct, list.products, user.name, updateProducts, showToast, t, validateProduct]);

  const handleQuickAdd = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    setOpenItemId(null);
    const product: Product = {
      id: generateProductId(),
      name: trimmedName,
      quantity: 1,
      unit: 'יח׳',
      category: 'אחר',
      isPurchased: false,
      addedBy: user.name,
      createdDate: formatDate(),
      createdTime: formatTime()
    };

    updateProducts([...list.products, product]);
    showToast(t('added'));
  }, [list.products, user.name, updateProducts, showToast, t]);

  const toggleProduct = useCallback((productId: string) => {
    updateProducts(
      list.products.map((p: Product) =>
        p.id === productId ? { ...p, isPurchased: !p.isPurchased } : p
      )
    );
    showToast(t('updated'));
    dismissHint();
  }, [list.products, updateProducts, showToast, t, dismissHint]);

  const deleteProduct = useCallback((productId: string) => {
    const product = list.products.find((p: Product) => p.id === productId);
    if (!product) return;

    setConfirm({
      title: t('deleteProduct'),
      message: `${t('delete')} "${product.name}"?`,
      onConfirm: () => {
        updateProducts(list.products.filter((p: Product) => p.id !== productId));
        setConfirm(null);
        showToast(t('deleted'));
      }
    });
  }, [list.products, updateProducts, showToast, t]);

  const saveEditedProduct = useCallback(() => {
    if (!showEdit || !hasProductChanges) return;
    haptic('medium');
    updateProducts(
      list.products.map((p: Product) => (p.id === showEdit.id ? showEdit : p))
    );
    setShowEdit(null);
    setOriginalEditProduct(null);
    showToast(t('saved'));
  }, [showEdit, hasProductChanges, list.products, updateProducts, showToast, t]);

  const openEditProduct = useCallback((product: Product) => {
    setShowEdit({ ...product });
    setOriginalEditProduct({ ...product });
  }, []);

  const closeEditProduct = useCallback(() => {
    setShowEdit(null);
    setOriginalEditProduct(null);
  }, []);

  // ===== Form Update Handlers =====
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

  // ===== List Edit Handlers =====
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

  const handleDeleteList = useCallback(() => {
    onDeleteList(list.id);
    onBack();
  }, [list.id, onDeleteList, onBack]);

  // ===== Member Handlers =====
  const removeMember = useCallback((memberId: string, memberName: string) => {
    const message = t('removeMemberConfirm').replace('{name}', memberName);
    setConfirm({
      title: t('removeMember'),
      message,
      onConfirm: () => {
        onUpdateList({
          ...list,
          members: list.members.filter((m: Member) => m.id !== memberId)
        });
        setConfirm(null);
        showToast(t('removed'));
      }
    });
  }, [list, onUpdateList, showToast, t]);

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
    // State
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

    // Computed values
    pending,
    purchased,
    items,
    allMembers,
    isOwner,
    hasProductChanges,
    hasListChanges,

    // Setters
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

    // Handlers
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
