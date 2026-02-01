import { useState, useCallback, useEffect, useMemo } from "react";
import type { User, List, Member, Product, LoginMethod } from "../types";
import { authApi, listsApi, type ApiList, type ApiMember } from "../../services/api";
import { socketService } from "../../services/socket";
import { getAccessToken, clearTokens } from "../../services/api/client";

// Re-export hooks
export { useDebounce } from './useDebounce';
export { useSocketNotifications, type LocalNotification } from './useSocketNotifications';
export { useServiceWorker } from './useServiceWorker';

// ===== useLocalStorage Hook =====
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}

// ===== useToast Hook =====
import type { ToastType } from '../types';

interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast(duration = 1200) {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success" });

  const showToast = useCallback(
    (msg: string, type: ToastType = "success") => {
      setToast({ message: msg, type });
      setTimeout(() => setToast({ message: "", type: "success" }), duration);
    },
    [duration],
  );

  return { message: toast.message, toastType: toast.type, showToast };
}

// ===== useAuth Hook =====
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const profile = await authApi.getProfile();
          setUser(profile);
          // Connect socket when authenticated
          socketService.connect();
        } catch {
          // Token invalid, clear it
          clearTokens();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (userData: User, _loginMethod: LoginMethod = "email") => {
      setUser(userData);
      // Login activity is tracked on the server via LoginActivity model
      // Connect socket after login
      socketService.connect();
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors, just clear local state
    }
    socketService.disconnect();
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;
      try {
        const updatedUser = await authApi.updateProfile(updates);
        setUser(updatedUser);
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    },
    [user],
  );

  return { user, login, logout, updateUser, isAuthenticated: !!user, loading };
}

// Helper to convert API member to client Member type
const convertApiMember = (apiMember: ApiMember): Member => ({
  id: apiMember.user.id,
  name: apiMember.user.name,
  email: apiMember.user.email,
  isAdmin: apiMember.isAdmin,
  joinedAt: apiMember.joinedAt,
});

// Helper to convert API product to client Product type
const convertApiProduct = (p: ApiList['products'][0]): Product => ({
  id: p.id,
  name: p.name,
  quantity: p.quantity,
  unit: p.unit,
  category: p.category,
  isPurchased: p.isPurchased,
  addedBy: p.addedBy,
  createdDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString('he-IL') : undefined,
  createdTime: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : undefined,
});

// Helper to convert API list to client List type
const convertApiList = (apiList: ApiList): List => ({
  id: apiList.id,
  name: apiList.name,
  icon: apiList.icon,
  color: apiList.color,
  isGroup: apiList.isGroup,
  owner: {
    id: apiList.owner.id,
    name: apiList.owner.name,
    email: apiList.owner.email,
    avatarColor: apiList.owner.avatarColor,
    avatarEmoji: apiList.owner.avatarEmoji,
  },
  members: apiList.members.map(convertApiMember),
  products: apiList.products.map(convertApiProduct),
  inviteCode: apiList.inviteCode,
  password: apiList.password,
  notifications: apiList.notifications,
});

// ===== useLists Hook =====
export function useLists(user: User | null) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const apiLists = await listsApi.getLists();
      setLists(apiLists.map(convertApiList));
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch lists when user changes
  useEffect(() => {
    if (user) {
      fetchLists();
    } else {
      setLists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-fetch when user.id changes
  }, [user?.id, fetchLists]);

  const createList = useCallback(
    async (list: Omit<List, 'id' | 'owner' | 'members' | 'products' | 'notifications'> & { id?: string; owner?: User; members?: Member[]; products?: Product[] }) => {
      // Generate temp ID for optimistic update
      const tempId = list.id || `temp_${Date.now()}`;

      // Create optimistic list immediately
      const optimisticList: List = {
        id: tempId,
        name: list.name,
        icon: list.icon,
        color: list.color,
        isGroup: list.isGroup,
        owner: list.owner || { id: '', name: '', email: '' },
        members: list.members || [],
        products: list.products || [],
        inviteCode: list.inviteCode || null,
        password: list.password || null,
      };

      // Add to state immediately (optimistic)
      setLists((prev) => [...prev, optimisticList]);

      try {
        // Call API in background
        const newList = await listsApi.createList({
          name: list.name,
          icon: list.icon,
          color: list.color,
          isGroup: list.isGroup,
          password: list.password || undefined,
        });

        // Replace temp list with server response
        setLists((prev) => prev.map((l) => l.id === tempId ? convertApiList(newList) : l));

        // Join socket room for the new list
        socketService.joinList(newList.id);

        return convertApiList(newList);
      } catch (error) {
        // Remove optimistic list on error
        setLists((prev) => prev.filter((l) => l.id !== tempId));
        console.error('Failed to create list:', error);
        throw error;
      }
    },
    [],
  );

  // Update list locally without API call (for optimistic updates)
  const updateListLocal = useCallback(
    (updatedList: List) => {
      setLists((prev) =>
        prev.map((l) => (l.id === updatedList.id ? updatedList : l)),
      );
    },
    [],
  );

  const updateList = useCallback(
    async (updatedList: List) => {
      try {
        const updated = await listsApi.updateList(updatedList.id, {
          name: updatedList.name,
          icon: updatedList.icon,
          color: updatedList.color,
        });
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
        );
      } catch (error) {
        console.error('Failed to update list:', error);
        throw error;
      }
    },
    [],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      try {
        await listsApi.deleteList(listId);
        setLists((prev) => prev.filter((l) => l.id !== listId));
      } catch (error) {
        console.error('Failed to delete list:', error);
        throw error;
      }
    },
    [],
  );

  const joinGroup = useCallback(
    async (code: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "userNotLoggedIn" };

      try {
        const joinedList = await listsApi.joinGroup({ inviteCode: code, password });
        setLists((prev) => [...prev, convertApiList(joinedList)]);
        // Join socket room for this list
        socketService.joinList(joinedList.id);
        // Notify other members that someone joined
        socketService.emitMemberJoined(joinedList.id, joinedList.name, user.name);
        return { success: true };
      } catch (error: unknown) {
        const apiError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
        const status = apiError.response?.status;
        const errorMessage = apiError.response?.data?.message || apiError.response?.data?.error;

        // Map specific errors to translation keys
        if (status === 404 || errorMessage?.toLowerCase().includes('invalid invite code')) {
          return { success: false, error: 'invalidGroupCode' };
        }
        if (status === 401 || errorMessage?.toLowerCase().includes('invalid password')) {
          return { success: false, error: 'invalidGroupPassword' };
        }
        if (status === 409 || errorMessage?.toLowerCase().includes('already a member')) {
          return { success: false, error: 'alreadyMember' };
        }
        if (errorMessage?.toLowerCase().includes('owner')) {
          return { success: false, error: 'youAreOwner' };
        }

        return { success: false, error: 'unknownError' };
      }
    },
    [user],
  );

  const leaveList = useCallback(
    async (listId: string) => {
      if (!user) return;

      // Get list name before leaving for notification
      const listToLeave = lists.find((l) => l.id === listId);

      try {
        // Notify other members that someone is leaving (before actually leaving)
        if (listToLeave) {
          socketService.emitMemberLeft(listId, listToLeave.name, user.name);
        }
        await listsApi.leaveGroup(listId);
        // Leave socket room
        socketService.leaveList(listId);
        setLists((prev) => prev.filter((l) => l.id !== listId));
      } catch (error) {
        console.error('Failed to leave list:', error);
        throw error;
      }
    },
    [user, lists],
  );

  // Remove list locally without API call (for when user is removed from group)
  const removeListLocal = useCallback(
    (listId: string) => {
      socketService.leaveList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    },
    [],
  );

  const markNotificationsRead = useCallback(
    (listId: string) => {
      // Update locally for now - can add API call later
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                notifications: (l.notifications || []).map((n) => ({
                  ...n,
                  read: true,
                })),
              }
            : l,
        ),
      );
    },
    [],
  );

  const markSingleNotificationRead = useCallback(
    (listId: string, notificationId: string) => {
      // Update locally for now - can add API call later
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                notifications: (l.notifications || []).map((n) =>
                  n.id === notificationId ? { ...n, read: true } : n
                ),
              }
            : l,
        ),
      );
    },
    [],
  );

  // Extract list IDs for stable dependency tracking
  const listIds = useMemo(() => lists.map(l => l.id).join(','), [lists]);

  // Subscribe to socket events for real-time updates
  useEffect(() => {
    if (!user) return;

    // Parse list IDs from the memoized string
    const currentIds = listIds ? listIds.split(',') : [];

    // Join all list rooms
    currentIds.forEach((id) => socketService.joinList(id));

    // Subscribe to list updates
    const unsubscribeListUpdated = socketService.on('list:updated', (data: unknown) => {
      const listData = data as { listId: string };
      // Refetch the specific list
      listsApi.getList(listData.listId).then((updated) => {
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
        );
      }).catch(console.error);
    });

    // Note: user:joined and user:left socket events are for PRESENCE tracking only
    // (indicating when a user's socket connects/disconnects from the room).
    // They fire on every app open, refresh, or network reconnect - NOT for actual
    // group membership changes. Actual group joins/leaves go through the REST API
    // and are stored as notifications in the database.
    // We intentionally do NOT refetch list data on these events to avoid:
    // 1. Unnecessary API calls on every reconnect
    // 2. Confusing users with activity when someone just reconnects

    // Subscribe to product events
    const unsubscribeProductAdded = socketService.on('product:added', (data: unknown) => {
      const eventData = data as { listId: string };
      // Refetch the list to get updated products
      listsApi.getList(eventData.listId).then((updated) => {
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
        );
      }).catch(console.error);
    });

    const unsubscribeProductUpdated = socketService.on('product:updated', (data: unknown) => {
      const eventData = data as { listId: string };
      listsApi.getList(eventData.listId).then((updated) => {
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
        );
      }).catch(console.error);
    });

    const unsubscribeProductDeleted = socketService.on('product:deleted', (data: unknown) => {
      const eventData = data as { listId: string };
      listsApi.getList(eventData.listId).then((updated) => {
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
        );
      }).catch(console.error);
    });

    const unsubscribeProductToggled = socketService.on('product:toggled', (data: unknown) => {
      const eventData = data as { listId: string };
      listsApi.getList(eventData.listId).then((updated) => {
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated) : l)),
        );
      }).catch(console.error);
    });

    return () => {
      unsubscribeListUpdated();
      unsubscribeProductAdded();
      unsubscribeProductUpdated();
      unsubscribeProductDeleted();
      unsubscribeProductToggled();
      // Leave all rooms on cleanup (currentIds captured from closure)
      currentIds.forEach((id) => socketService.leaveList(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when user.id or list IDs change
  }, [user?.id, listIds]);

  return {
    lists,
    loading,
    createList,
    updateList,
    updateListLocal,
    deleteList,
    joinGroup,
    leaveList,
    removeListLocal,
    markNotificationsRead,
    markSingleNotificationRead,
    refetch: fetchLists,
  };
}
