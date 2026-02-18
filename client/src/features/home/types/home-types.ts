import type { List } from '../../../global/types';

// ===== טיפוסי מצב טופס =====
export interface NewListForm {
  name: string;
  icon: string;
  color: string;
}

// ===== טיפוס טאב =====
export type HomeTab = 'all' | 'my' | 'groups';

// ===== ערכי החזרה של Hooks =====
export interface UseHomeReturn {
  tab: HomeTab;
  search: string;
  showMenu: boolean;
  showCreate: boolean;
  showCreateGroup: boolean;
  showJoin: boolean;
  showNotifications: boolean;
  confirmLogout: boolean;
  editList: List | null;
  confirmDeleteList: List | null;
  newL: NewListForm;
  joinCode: string;
  joinPass: string;
  joinError: string;
  createError: string;
  joiningGroup: boolean;
  joinCooldown: number;

  userLists: List[];
  my: List[];
  groups: List[];
  display: List[];

  setTab: (tab: HomeTab) => void;
  setSearch: (search: string) => void;
  setShowMenu: (show: boolean) => void;
  setShowCreate: (show: boolean) => void;
  setShowCreateGroup: (show: boolean) => void;
  setShowJoin: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
  setConfirmLogout: (show: boolean) => void;
  setEditList: (list: List | null) => void;
  setConfirmDeleteList: (list: List | null) => void;
  setNewL: (form: NewListForm) => void;
  setJoinCode: (code: string) => void;
  setJoinPass: (pass: string) => void;
  setJoinError: (error: string) => void;
  setCreateError: (error: string) => void;

  handleCreate: (isGroup: boolean) => void;
  handleJoin: () => void;
  openOption: (option: string) => void;
  closeCreateModal: () => void;
  closeCreateGroupModal: () => void;
  closeJoinModal: () => void;
  updateNewListField: <K extends keyof NewListForm>(field: K, value: NewListForm[K]) => void;
  updateEditListField: <K extends keyof List>(field: K, value: List[K]) => void;
  saveEditList: () => void;
  deleteList: () => void;
}
