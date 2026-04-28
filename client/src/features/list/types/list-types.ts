import type { Product, ProductUnit, ProductCategory, Member } from '../../../global/types';

// ===== טיפוסי מצב טופס =====
export interface NewProductForm {
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  note: string;
  // ברקוד אופציונלי - כשממולא, השוואת המחירים מזהה את המוצר ב-100%
  // (lookup ישיר על ברקוד במקום fuzzy על שם).
  barcode: string;
}

export interface EditListForm {
  name: string;
  icon: string;
  color: string;
}

// ===== מצב דיאלוג אישור =====
export interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

// ===== מיקום FAB =====
export interface FabPosition {
  x: number;
  y: number;
}

// ===== מצב גרירה =====
export interface DragState {
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
}

// ===== טיפוס סינון =====
export type ListFilter = 'pending' | 'purchased';

// ===== ערכי החזרה של Hooks =====
export interface UseListReturn {
  filter: ListFilter;
  search: string;
  showAdd: boolean;
  showEdit: Product | null;
  showDetails: Product | null;
  showInvite: boolean;
  showMembers: boolean;
  showShareList: boolean;
  showEditList: boolean;
  editListData: EditListForm | null;
  confirmDeleteList: boolean;
  confirm: ConfirmState | null;
  newProduct: NewProductForm;
  openItemId: string | null;
  showHint: boolean;
  addError: string;
  refreshing: boolean;
  fabPosition: FabPosition | null;
  showFab: boolean;
  isDragging: boolean;

  pending: Product[];
  purchased: Product[];
  items: Product[];
  allMembers: Member[];
  isOwner: boolean;
  hasProductChanges: boolean;
  hasListChanges: boolean;

  setFilter: (filter: ListFilter) => void;
  setSearch: (search: string) => void;
  setShowAdd: (show: boolean) => void;
  setShowEdit: (product: Product | null) => void;
  setShowDetails: (product: Product | null) => void;
  setShowInvite: (show: boolean) => void;
  setShowMembers: (show: boolean) => void;
  setShowShareList: (show: boolean) => void;
  setShowEditList: (show: boolean) => void;
  setEditListData: (data: EditListForm | null) => void;
  setConfirmDeleteList: (show: boolean) => void;
  setConfirm: (confirm: ConfirmState | null) => void;
  setNewProduct: (data: NewProductForm) => void;
  setOpenItemId: (id: string | null) => void;
  setAddError: (error: string) => void;

  // currentCenterX/Y אופציונליים: הקומפוננטה מעבירה את המיקום הנוכחי בפועל
  // של ה-FAB (אחרי תנועות קודמות) כדי למנוע קפיצה בחציית סף הגרירה.
  handleDragStart: (clientX: number, clientY: number, currentCenterX?: number, currentCenterY?: number) => void;
  handleDragMove: (clientX: number, clientY: number) => void;
  handleDragEnd: () => void;
  dismissHint: () => void;
  handleAdd: () => void;
  handleQuickAdd: (name: string) => void;
  handleEditList: () => void;
  saveListChanges: () => void;
  handleDeleteList: () => void;
  removeMember: (memberId: string, memberName: string) => void;
  leaveList: () => void;
  updateProducts: (products: Product[]) => void;
  toggleProduct: (productId: string, silent?: boolean) => void;
  deleteProduct: (productId: string) => void;
  saveEditedProduct: () => void;
  openEditProduct: (product: Product) => void;
  closeEditProduct: () => void;
  updateNewProductField: <K extends keyof NewProductForm>(field: K, value: NewProductForm[K]) => void;
  updateEditProductField: <K extends keyof Product>(field: K, value: Product[K]) => void;
  incrementQuantity: (type: 'new' | 'edit') => void;
  decrementQuantity: (type: 'new' | 'edit') => void;
  closeAddModal: () => void;
  duplicateProduct: { existing: Product; newData: { name: string; quantity: number; unit: Product['unit']; category: Product['category'] } } | null;
  handleDuplicateIncreaseQuantity: () => void;
  handleDuplicateAddNew: () => void;
  handleDuplicateCancel: () => void;
  refreshList: () => void;
  showClearList: boolean;
  setShowClearList: (show: boolean) => void;
  handleClearList: (filter: 'all' | 'purchased' | 'pending') => void;
  handleResetList: () => void;
  showCelebration: boolean;
}
