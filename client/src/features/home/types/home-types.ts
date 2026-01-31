import type { List, Notification } from '../../../global/types';

// ===== Form State Types =====
export interface NewListForm {
  name: string;
  icon: string;
  color: string;
}

// ===== Tab Type =====
export type HomeTab = 'all' | 'my' | 'groups';

// ===== Extended Notification Type =====
export interface ExtendedNotification extends Notification {
  listName: string;
  listId: string;
}

// ===== Hook Return Types =====
export interface UseHomeReturn {
  // State
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

  // Computed values
  userLists: List[];
  my: List[];
  groups: List[];
  myNotifications: ExtendedNotification[];
  unreadCount: number;
  display: List[];

  // Setters
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

  // Handlers
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
  markAllNotificationsRead: () => void;
  markNotificationRead: (listId: string, notificationId: string) => void;
}
