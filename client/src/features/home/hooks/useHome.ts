import { useState, useMemo, useCallback } from 'react';
import type { List, Member, Notification, User } from '../../../global/types';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDebounce } from '../../../global/hooks';
import { generateInviteCode, generatePassword, generateListId } from '../helpers/home-helpers';
import type {
  NewListForm,
  HomeTab,
  ExtendedNotification,
  UseHomeReturn
} from '../types/home-types';

// ===== Constants =====
const DEFAULT_COLOR = '#14B8A6';
const MIN_NAME_LENGTH = 2;

const DEFAULT_NEW_LIST: NewListForm = {
  name: '',
  icon: '📋',
  color: DEFAULT_COLOR
};

const DEFAULT_NEW_GROUP: NewListForm = {
  name: '',
  icon: '👨‍👩‍👧‍👦',
  color: DEFAULT_COLOR
};

// ===== Types =====
interface UseHomeParams {
  lists: List[];
  user: User;
  onCreateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (code: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onMarkNotificationsRead: (listId: string) => void;
  onMarkSingleNotificationRead: (listId: string, notificationId: string) => void;
}

export const useHome = ({
  lists,
  user,
  onCreateList,
  onDeleteList,
  onEditList,
  onJoinGroup,
  onMarkNotificationsRead,
  onMarkSingleNotificationRead
}: UseHomeParams): UseHomeReturn => {
  const { t, settings } = useSettings();
  const notificationSettings = settings.notifications;

  // ===== UI State =====
  const [tab, setTab] = useState<HomeTab>('all');
  const [search, setSearch] = useState('');

  // ===== Modal State =====
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editList, setEditList] = useState<List | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<List | null>(null);

  // ===== Form State =====
  const [newL, setNewL] = useState<NewListForm>(DEFAULT_NEW_LIST);
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);

  // ===== Computed Values =====
  const userLists = useMemo(() => lists.filter((l: List) => {
    if (l.isGroup) return l.owner.id === user.id || l.members.some((m: Member) => m.id === user.id);
    return l.owner.id === user.id;
  }), [lists, user.id]);

  const { my, groups } = useMemo(() => ({
    my: userLists.filter((l: List) => !l.isGroup),
    groups: userLists.filter((l: List) => l.isGroup)
  }), [userLists]);

  // Track dismissed notifications for optimistic UI updates (session only, persisted to DB)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const myNotifications = useMemo((): ExtendedNotification[] => {
    // If notifications are disabled globally, return empty
    if (!notificationSettings.enabled) return [];

    return userLists
      .filter((l: List) => l.isGroup && (l.notifications?.length ?? 0) > 0)
      .flatMap((l: List) => {
        // Find when the current user joined this group
        const myMembership = l.members.find((m: Member) => m.id === user.id);
        const myJoinedAt = myMembership?.joinedAt ? new Date(myMembership.joinedAt).getTime() : 0;

        return (l.notifications || [])
          .filter((n: Notification) => {
            // Skip read notifications, self-created notifications, and dismissed notifications
            if (n.read || n.userId === user.id || dismissedIds.has(n.id)) return false;
            // Skip notifications that occurred before user joined
            const notifTime = new Date(n.timestamp).getTime();
            if (notifTime < myJoinedAt) return false;
            // Filter based on notification type settings
            if (n.type === 'join' && !notificationSettings.groupJoin) return false;
            if (n.type === 'leave' && !notificationSettings.groupLeave) return false;
            if (n.type === 'list_update' && !notificationSettings.listUpdate) return false;
            return true;
          })
          .map((n: Notification) => ({ ...n, listName: l.name, listId: l.id }));
      });
  }, [userLists, user.id, notificationSettings, dismissedIds]);

  const unreadCount = myNotifications.length;

  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 300);

  const display = useMemo(() => {
    const base = tab === 'all' ? userLists : tab === 'my' ? my : groups;
    return debouncedSearch ? base.filter((l: List) => l.name.includes(debouncedSearch)) : base;
  }, [tab, userLists, my, groups, debouncedSearch]);

  // ===== Create List Handlers =====
  const validateListName = useCallback((): boolean => {
    if (!newL.name.trim()) {
      setCreateError(t('enterListName'));
      return false;
    }
    if (newL.name.length < MIN_NAME_LENGTH) {
      setCreateError(t('nameTooShort'));
      return false;
    }
    return true;
  }, [newL.name, t]);

  const handleCreate = useCallback((isGroup: boolean) => {
    setCreateError('');
    if (!validateListName()) return;

    onCreateList({
      id: generateListId(),
      ...newL,
      isGroup,
      owner: user,
      members: [],
      products: [],
      inviteCode: isGroup ? generateInviteCode() : null,
      password: isGroup ? generatePassword() : null
    });

    setNewL(isGroup ? DEFAULT_NEW_GROUP : DEFAULT_NEW_LIST);
    setShowCreate(false);
    setShowCreateGroup(false);
  }, [newL, onCreateList, user, validateListName]);

  // ===== Join Group Handlers =====
  const handleJoin = useCallback(async () => {
    setJoinError('');
    if (!joinCode.trim() || !joinPass.trim()) {
      setJoinError(t('enterCodeAndPassword'));
      return;
    }

    setJoiningGroup(true);
    try {
      const result = await onJoinGroup(joinCode.trim().toUpperCase(), joinPass.trim());
      if (result.success) {
        setShowJoin(false);
        setJoinCode('');
        setJoinPass('');
      } else {
        // result.error is a translation key
        setJoinError(result.error ? t(result.error as Parameters<typeof t>[0]) : t('unknownError'));
      }
    } finally {
      setJoiningGroup(false);
    }
  }, [joinCode, joinPass, onJoinGroup, t]);

  // ===== Menu Handlers =====
  const openOption = useCallback((option: string) => {
    setShowMenu(false);
    if (option === 'private') setShowCreate(true);
    else if (option === 'group') setShowCreateGroup(true);
    else if (option === 'join') setShowJoin(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
    setNewL(DEFAULT_NEW_LIST);
    setCreateError('');
  }, []);

  const closeCreateGroupModal = useCallback(() => {
    setShowCreateGroup(false);
    setNewL(DEFAULT_NEW_GROUP);
    setCreateError('');
  }, []);

  const closeJoinModal = useCallback(() => {
    setShowJoin(false);
    setJoinError('');
    setJoinCode('');
    setJoinPass('');
  }, []);

  // ===== Form Field Handlers =====
  const updateNewListField = useCallback(<K extends keyof NewListForm>(
    field: K,
    value: NewListForm[K]
  ) => {
    setNewL(prev => ({ ...prev, [field]: value }));
    if (field === 'name') setCreateError('');
  }, []);

  const updateEditListField = useCallback(<K extends keyof List>(
    field: K,
    value: List[K]
  ) => {
    setEditList(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  // ===== Edit/Delete List Handlers =====
  const saveEditList = useCallback(() => {
    if (!editList) return;
    onEditList(editList);
    setEditList(null);
  }, [editList, onEditList]);

  const deleteList = useCallback(() => {
    if (!confirmDeleteList) return;
    onDeleteList(confirmDeleteList.id);
    setConfirmDeleteList(null);
  }, [confirmDeleteList, onDeleteList]);

  // ===== Notifications Handlers =====
  const markAllNotificationsRead = useCallback(() => {
    // Optimistic UI update - mark as dismissed locally
    setDismissedIds(prev => {
      const next = new Set(prev);
      myNotifications.forEach(n => next.add(n.id));
      return next;
    });
    // Persist to database for each list
    myNotifications.forEach((n) => onMarkNotificationsRead(n.listId));
    setShowNotifications(false);
  }, [myNotifications, onMarkNotificationsRead]);

  const markNotificationRead = useCallback((listId: string, notificationId: string) => {
    // Optimistic UI update - mark as dismissed locally
    setDismissedIds(prev => new Set(prev).add(notificationId));
    // Persist to database
    onMarkSingleNotificationRead(listId, notificationId);
  }, [onMarkSingleNotificationRead]);

  return {
    // State
    tab,
    search,
    showMenu,
    showCreate,
    showCreateGroup,
    showJoin,
    showNotifications,
    confirmLogout,
    editList,
    confirmDeleteList,
    newL,
    joinCode,
    joinPass,
    joinError,
    createError,
    joiningGroup,

    // Computed values
    userLists,
    my,
    groups,
    myNotifications,
    unreadCount,
    display,

    // Setters
    setTab,
    setSearch,
    setShowMenu,
    setShowCreate,
    setShowCreateGroup,
    setShowJoin,
    setShowNotifications,
    setConfirmLogout,
    setEditList,
    setConfirmDeleteList,
    setNewL,
    setJoinCode,
    setJoinPass,
    setJoinError,
    setCreateError,

    // Handlers
    handleCreate,
    handleJoin,
    openOption,
    closeCreateModal,
    closeCreateGroupModal,
    closeJoinModal,
    updateNewListField,
    updateEditListField,
    saveEditList,
    deleteList,
    markAllNotificationsRead,
    markNotificationRead
  };
};
