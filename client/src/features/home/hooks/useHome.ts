import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { List, Member, User } from '../../../global/types';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDebounce } from '../../../global/hooks';
import { generatePassword } from '../helpers/home-helpers';
import type {
  NewListForm,
  HomeTab,
  UseHomeReturn
} from '../types/home-types';

// ===== קבועים =====
const DEFAULT_COLOR = '#14B8A6';
const MIN_NAME_LENGTH = 2;
const MAX_JOIN_ATTEMPTS = 10;
const COOLDOWN_SECONDS = 60;

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

// ===== טיפוסים =====
interface UseHomeParams {
  lists: List[];
  user: User;
  onCreateList: (list: { name: string; icon: string; color: string; isGroup: boolean; password?: string | null }) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (code: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const useHome = ({
  lists,
  user,
  onCreateList,
  onDeleteList,
  onEditList,
  onJoinGroup,
}: UseHomeParams): UseHomeReturn => {
  const { t } = useSettings();

  // ===== מצב UI =====
  const [tab, setTab] = useState<HomeTab>('all');
  const [search, setSearch] = useState('');

  // ===== מצב מודאלים =====
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editList, setEditList] = useState<List | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<List | null>(null);

  // ===== מצב טפסים =====
  const [newL, setNewL] = useState<NewListForm>(DEFAULT_NEW_LIST);
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);

  // ===== הגבלת ניסיונות הצטרפות =====
  const joinAttemptsRef = useRef(0);
  const [joinCooldown, setJoinCooldown] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (joinCooldown <= 0) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      return;
    }
    cooldownTimerRef.current = setInterval(() => {
      setJoinCooldown(prev => {
        if (prev <= 1) {
          joinAttemptsRef.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, [joinCooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps -- רק בדיקה אם קיים cooldown

  // ===== ערכים מחושבים =====
  const userLists = useMemo(() => lists.filter((l: List) => {
    if (l.isGroup) return l.owner.id === user.id || l.members.some((m: Member) => m.id === user.id);
    return l.owner.id === user.id;
  }), [lists, user.id]);

  const { my, groups } = useMemo(() => ({
    my: userLists.filter((l: List) => !l.isGroup),
    groups: userLists.filter((l: List) => l.isGroup)
  }), [userLists]);

  // Debounce לחיפוש
  const debouncedSearch = useDebounce(search, 300);

  const display = useMemo(() => {
    const base = tab === 'all' ? userLists : tab === 'my' ? my : groups;
    return debouncedSearch ? base.filter((l: List) => l.name.toLowerCase().includes(debouncedSearch.toLowerCase())) : base;
  }, [tab, userLists, my, groups, debouncedSearch]);

  // ===== טיפול ביצירת רשימה =====
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
      ...newL,
      isGroup,
      password: isGroup ? generatePassword() : null,
    });

    setNewL(isGroup ? DEFAULT_NEW_GROUP : DEFAULT_NEW_LIST);
    setShowCreate(false);
    setShowCreateGroup(false);
  }, [newL, onCreateList, validateListName]);

  // ===== טיפול בהצטרפות לרשימה =====
  const handleJoin = useCallback(async () => {
    setJoinError('');

    // בדיקת cooldown פעיל
    if (joinCooldown > 0) return;

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
        joinAttemptsRef.current = 0;
      } else {
        joinAttemptsRef.current++;

        // הפעלת cooldown אחרי מקסימום ניסיונות
        if (joinAttemptsRef.current >= MAX_JOIN_ATTEMPTS) {
          setJoinCooldown(COOLDOWN_SECONDS);
          setJoinError(t('tooManyAttempts'));
        } else {
          setJoinError(result.error ? t(result.error as Parameters<typeof t>[0]) : t('unknownError'));
        }
      }
    } finally {
      setJoiningGroup(false);
    }
  }, [joinCode, joinPass, joinCooldown, onJoinGroup, t]);

  // ===== טיפול בתפריט =====
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

  // ===== טיפול בשדות טופס =====
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

  // ===== טיפול בעריכה/מחיקת רשימה =====
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

  return {
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
    joinCooldown,

    userLists,
    my,
    groups,
    display,

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
  };
};
