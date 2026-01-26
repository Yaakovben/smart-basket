import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Product, List, User, Member } from '../../../global/types';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDate, formatTime, generateProductId } from '../helpers/list-helpers';
import type {
  NewProductForm,
  EditListForm,
  ConfirmState,
  FabPosition,
  DragState,
  ListFilter,
  UseListReturn
} from '../types/list-types';

interface UseListParams {
  list: List;
  user: User;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onBack: () => void;
  showToast: (message: string) => void;
}

const DEFAULT_NEW_PRODUCT: NewProductForm = {
  name: '',
  quantity: 1,
  unit: 'יח׳',
  category: 'אחר'
};

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

  // ===== UI State =====
  const [filter, setFilter] = useState<ListFilter>('pending');
  const [search, setSearch] = useState('');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => !localStorage.getItem('sb_hint_seen'));
  const [addError, setAddError] = useState('');

  // ===== Modal State =====
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState<Product | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showShareList, setShowShareList] = useState(false);
  const [showEditList, setShowEditList] = useState(false);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // ===== Form State =====
  const [newP, setNewP] = useState<NewProductForm>(DEFAULT_NEW_PRODUCT);
  const [editListData, setEditListData] = useState<EditListForm | null>(null);

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

  const items = useMemo(
    () => (filter === 'pending' ? pending : purchased).filter((p: Product) => p.name.includes(search)),
    [filter, pending, purchased, search]
  );

  const allMembers = useMemo(
    () => [list.owner, ...list.members],
    [list.owner, list.members]
  );

  const isOwner = useMemo(
    () => list.owner.id === user.id,
    [list.owner.id, user.id]
  );

  // ===== Effects =====
  useEffect(() => {
    if (items.length <= 3) setFabPosition(null);
  }, [items.length]);

  // ===== Drag Handlers =====
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    const currentX = fabPosition?.x ?? window.innerWidth / 2;
    const currentY = fabPosition?.y ?? window.innerHeight - 90;
    dragRef.current = { startX: clientX, startY: clientY, startPosX: currentX, startPosY: currentY };
    setIsDragging(true);
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !isDragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    const newX = Math.max(40, Math.min(window.innerWidth - 40, dragRef.current.startPosX + dx));
    const newY = Math.max(100, Math.min(window.innerHeight - 60, dragRef.current.startPosY + dy));
    setFabPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // ===== Hint Handler =====
  const dismissHint = useCallback(() => {
    setShowHint(false);
    localStorage.setItem('sb_hint_seen', 'true');
  }, []);

  // ===== Product Handlers =====
  const updateProducts = useCallback((products: Product[]) => {
    onUpdateList({ ...list, products });
  }, [list, onUpdateList]);

  const handleAdd = useCallback(() => {
    setAddError('');
    if (!newP.name.trim()) {
      setAddError(t('enterProductName'));
      return;
    }
    if (newP.name.length < 2) {
      setAddError(t('productNameTooShort'));
      return;
    }
    if (newP.quantity < 1) {
      setAddError(t('quantityMin'));
      return;
    }

    setOpenItemId(null);
    const newProduct: Product = {
      id: generateProductId(),
      ...newP,
      isPurchased: false,
      addedBy: user.name,
      createdDate: formatDate(),
      createdTime: formatTime()
    };

    updateProducts([...list.products, newProduct]);
    setNewP(DEFAULT_NEW_PRODUCT);
    setShowAdd(false);
    showToast(t('added'));
  }, [newP, list.products, user.name, updateProducts, showToast, t]);

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
    updateProducts(list.products.filter((p: Product) => p.id !== productId));
    showToast(t('deleted'));
  }, [list.products, updateProducts, showToast, t]);

  const saveEditedProduct = useCallback(() => {
    if (!showEdit) return;
    haptic('medium');
    updateProducts(
      list.products.map((p: Product) => (p.id === showEdit.id ? showEdit : p))
    );
    setShowEdit(null);
    showToast(t('saved'));
  }, [showEdit, list.products, updateProducts, showToast, t]);

  // ===== Form Update Handlers =====
  const updateNewProductField = useCallback(<K extends keyof NewProductForm>(
    field: K,
    value: NewProductForm[K]
  ) => {
    setNewP(prev => ({ ...prev, [field]: value }));
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
      setNewP(prev => ({ ...prev, quantity: prev.quantity + 1 }));
    } else if (showEdit) {
      setShowEdit(prev => prev ? { ...prev, quantity: prev.quantity + 1 } : null);
    }
  }, [showEdit]);

  const decrementQuantity = useCallback((type: 'new' | 'edit') => {
    if (type === 'new') {
      setNewP(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }));
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
    if (!editListData) return;
    onUpdateList({ ...list, ...editListData });
    setShowEditList(false);
    showToast(t('saved'));
  }, [list, editListData, onUpdateList, showToast, t]);

  const handleDeleteList = useCallback(() => {
    onDeleteList(list.id);
    onBack();
  }, [list.id, onDeleteList, onBack]);

  // ===== Member Handlers =====
  const removeMember = useCallback((memberId: string) => {
    setConfirm({
      title: t('removeMember'),
      message: t('removeMember') + '?',
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
      message: t('leaveGroup') + '?',
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
    newP,
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
    setNewP,
    setOpenItemId,
    setAddError,

    // Handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    dismissHint,
    handleAdd,
    handleEditList,
    saveListChanges,
    handleDeleteList,
    removeMember,
    leaveList,
    updateProducts,
    toggleProduct,
    deleteProduct,
    saveEditedProduct,
    updateNewProductField,
    updateEditProductField,
    incrementQuantity,
    decrementQuantity,
    closeAddModal
  };
};
