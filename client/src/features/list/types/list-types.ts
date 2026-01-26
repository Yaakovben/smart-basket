import type { Product, ProductUnit, ProductCategory, Member } from '../../../global/types';

// ===== Form State Types =====
export interface NewProductForm {
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
}

export interface EditListForm {
  name: string;
  icon: string;
  color: string;
}

// ===== Confirm Dialog State =====
export interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

// ===== FAB Position =====
export interface FabPosition {
  x: number;
  y: number;
}

// ===== Drag State =====
export interface DragState {
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
}

// ===== Filter Type =====
export type ListFilter = 'pending' | 'purchased';

// ===== Hook Return Types =====
export interface UseListReturn {
  // State
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
  fabPosition: FabPosition | null;
  isDragging: boolean;

  // Computed values
  pending: Product[];
  purchased: Product[];
  items: Product[];
  allMembers: Member[];
  isOwner: boolean;

  // Setters
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

  // Handlers
  handleDragStart: (clientX: number, clientY: number) => void;
  handleDragMove: (clientX: number, clientY: number) => void;
  handleDragEnd: () => void;
  dismissHint: () => void;
  handleAdd: () => void;
  handleEditList: () => void;
  saveListChanges: () => void;
  handleDeleteList: () => void;
  removeMember: (memberId: string) => void;
  leaveList: () => void;
  updateProducts: (products: Product[]) => void;
  toggleProduct: (productId: string) => void;
  deleteProduct: (productId: string) => void;
  saveEditedProduct: () => void;
  updateNewProductField: <K extends keyof NewProductForm>(field: K, value: NewProductForm[K]) => void;
  updateEditProductField: <K extends keyof Product>(field: K, value: Product[K]) => void;
  incrementQuantity: (type: 'new' | 'edit') => void;
  decrementQuantity: (type: 'new' | 'edit') => void;
  closeAddModal: () => void;
}
