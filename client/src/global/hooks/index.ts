import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { User, List, Member, Product, LoginMethod } from "../types";
import { authApi, listsApi, pushApi, type ApiList, type ApiMember } from "../../services/api";
import { socketService } from "../../services/socket";
import { getAccessToken, clearTokens } from "../../services/api/client";
import { useSettings } from "../context/SettingsContext";
import { getLocale } from "../helpers";

// Re-export hooks
export { useDebounce } from './useDebounce';
export { useSocketNotifications, type LocalNotification } from './useSocketNotifications';
export { useServiceWorker } from './useServiceWorker';
export { useNotifications } from './useNotifications';
export { usePushNotifications } from './usePushNotifications';
export { usePresence } from './usePresence';

// ===== useToast Hook =====
import type { ToastType } from '../types';

interface ToastState {
  message: string;
  type: ToastType;
}

// Toast duration by type - info/warning are longer for notification messages
const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 1500,
  error: 3000,
  info: 5000,  // 5 seconds for notification messages - enough time to read
  warning: 5000 // 5 seconds for important warnings
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, type: ToastType = "success") => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ message: msg, type });
      const duration = TOAST_DURATIONS[type];
      timeoutRef.current = setTimeout(() => {
        setToast({ message: "", type: "success" });
        timeoutRef.current = null;
      }, duration);
    },
    [],
  );

  const hideToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message: "", type: "success" });
  }, []);

  return { message: toast.message, toastType: toast.type, showToast, hideToast };
}

// Initial data type for parallel loading optimization
export interface InitialData {
  lists: ApiList[] | null;
  notifications: { notifications: import('../../services/api').PersistedNotification[]; unreadCount: number } | null;
}

// ===== useAuth Hook =====
export function useAuth() {
  // Check for cached user in localStorage for instant render
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      if (cached && getAccessToken()) {
        return JSON.parse(cached);
      }
    } catch { /* ignore */ }
    return null;
  });
  // Show loading while we validate token and fetch initial data
  // This keeps the HTML loader visible until data is ready, preventing empty page flash
  const [loading, setLoading] = useState(() => !!getAccessToken());
  // Pre-fetched data for faster initial load (fetched in parallel with profile)
  const [initialData, setInitialData] = useState<InitialData>({ lists: null, notifications: null });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        // No token - clear any cached user and stop loading
        localStorage.removeItem('cached_user');
        setUser(null);
        setLoading(false);
        return;
      }

      // If we have a cached user, connect socket immediately while we validate
      if (user) {
        socketService.connect();
      }

      // Timeout promise - don't hang forever if API is down
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
      });

      try {
        // Fetch profile, lists, and notifications in PARALLEL (with 10s timeout)
        const [profile, listsResult, notificationsResult] = await Promise.race([
          Promise.all([
            authApi.getProfile(),
            listsApi.getLists().catch(() => null),
            import('../../services/api').then(({ notificationsApi }) =>
              notificationsApi.getNotifications({ limit: 50 }).catch(() => null)
            ),
          ]),
          timeout.then(() => { throw new Error('timeout'); }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ]) as any;

        clearTimeout(timeoutId!);

        // Cache user for next load
        localStorage.setItem('cached_user', JSON.stringify(profile));
        setUser(profile);

        // Store pre-fetched data for hooks to consume
        setInitialData({
          lists: listsResult,
          notifications: notificationsResult ? {
            notifications: notificationsResult.notifications,
            unreadCount: notificationsResult.notifications.filter((n: { read: boolean }) => !n.read).length,
          } : null,
        });

        // Connect socket when authenticated (if not already connected)
        socketService.connect();
      } catch {
        clearTimeout(timeoutId!);
        // Token invalid or timeout, clear everything
        socketService.disconnect();
        clearTokens();
        localStorage.removeItem('cached_user');
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (userData: User, _loginMethod: LoginMethod = "email") => {
      // Cache user for instant load on next visit
      localStorage.setItem('cached_user', JSON.stringify(userData));
      setUser(userData);
      // Login activity is tracked on the server via LoginActivity model
      // Connect socket after login
      socketService.connect();
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      // Unsubscribe from push notifications BEFORE logging out
      // This removes the subscription from server and browser
      await pushApi.unsubscribeAllPush();
    } catch {
      // Continue with logout even if push unsubscribe fails
    }
    try {
      await authApi.logout();
    } catch {
      // Ignore errors, just clear local state
    }
    socketService.disconnect();
    localStorage.removeItem('cached_user');
    setInitialData({ lists: null, notifications: null });
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;
      try {
        const updatedUser = await authApi.updateProfile(updates);
        localStorage.setItem('cached_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (error) {
        throw error;
      }
    },
    [user],
  );

  return { user, login, logout, updateUser, isAuthenticated: !!user, loading, initialData };
}

// Helper to convert API member to client Member type
const convertApiMember = (apiMember: ApiMember): Member => ({
  id: apiMember.user.id,
  name: apiMember.user.name,
  email: apiMember.user.email,
  avatarColor: apiMember.user.avatarColor,
  avatarEmoji: apiMember.user.avatarEmoji,
  isAdmin: apiMember.isAdmin,
  joinedAt: apiMember.joinedAt,
});

// Helper to convert API product to client Product type
const convertApiProduct = (p: ApiList['products'][0], locale: string): Product => ({
  id: p.id,
  name: p.name,
  quantity: p.quantity,
  unit: p.unit,
  category: p.category,
  isPurchased: p.isPurchased,
  addedBy: p.addedBy,
  createdDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString(locale) : undefined,
  createdTime: p.createdAt ? new Date(p.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : undefined,
});

// Helper to convert API list to client List type
const convertApiList = (apiList: ApiList, locale: string): List => ({
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
  products: apiList.products.map(p => convertApiProduct(p, locale)),
  inviteCode: apiList.inviteCode,
  password: apiList.password,
});

// ===== useLists Hook =====
export function useLists(user: User | null, initialLists?: ApiList[] | null) {
  const { settings } = useSettings();
  const locale = getLocale(settings.language);

  // Use pre-fetched lists if available for instant render
  const [lists, setLists] = useState<List[]>(() =>
    initialLists ? initialLists.map(l => convertApiList(l, locale)) : []
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  // Track which user we've initialized pre-fetched data for
  const initializedForRef = useRef<string | null>(initialLists ? '__initial__' : null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const apiLists = await listsApi.getLists();
      setLists(apiLists.map(l => convertApiList(l, locale)));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  // Sync with pre-fetched data when it arrives from useAuth's parallel fetch
  useEffect(() => {
    if (initialLists && !initializedForRef.current) {
      setLists(initialLists.map(l => convertApiList(l, locale)));
      initializedForRef.current = '__initial__';
    }
  }, [initialLists]);

  // Fetch lists when user changes (skip if already initialized with pre-fetched data for this user)
  useEffect(() => {
    if (user) {
      // User changed since last initialization — must fetch fresh data
      if (initializedForRef.current && initializedForRef.current !== user.id) {
        initializedForRef.current = null;
      }
      // Skip fetch if we already have pre-fetched data for this user
      if (initializedForRef.current) {
        initializedForRef.current = user.id;
        return;
      }
      initializedForRef.current = user.id;
      fetchLists();
    } else {
      initializedForRef.current = null;
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
        setLists((prev) => prev.map((l) => l.id === tempId ? convertApiList(newList, locale) : l));

        // Join socket room for the new list
        socketService.joinList(newList.id);

        return convertApiList(newList, locale);
      } catch (error) {
        // Remove optimistic list on error
        setLists((prev) => prev.filter((l) => l.id !== tempId));
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
      // Find old list to compare what changed
      const oldList = lists.find((l) => l.id === updatedList.id);

      try {
        const updated = await listsApi.updateList(updatedList.id, {
          name: updatedList.name,
          icon: updatedList.icon,
          color: updatedList.color,
        });
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? convertApiList(updated, locale) : l)),
        );
        // Emit socket event for group lists to notify other members in real-time
        if (updatedList.isGroup && user && oldList) {
          // Determine what changed
          const nameChanged = oldList.name !== updatedList.name;
          const designChanged = oldList.icon !== updatedList.icon || oldList.color !== updatedList.color;

          let changeType: 'name' | 'design' | 'both' | undefined;
          if (nameChanged && designChanged) {
            changeType = 'both';
          } else if (nameChanged) {
            changeType = 'name';
          } else if (designChanged) {
            changeType = 'design';
          }

          socketService.emitListUpdated(
            updatedList.id,
            oldList.name, // Send old name for context
            user.name,
            changeType,
            nameChanged ? updatedList.name : undefined
          );
        }
      } catch (error) {
        throw error;
      }
    },
    [user, lists],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const listToDelete = lists.find((l) => l.id === listId);

      // For group lists: emit socket event and WAIT for server ack before API delete
      // Server needs to verify ownership and notify members while the list still exists
      if (listToDelete?.isGroup && user) {
        const memberIds = listToDelete.members
          .map((m) => m.id)
          .filter((id) => id !== user.id);
        if (memberIds.length > 0) {
          await new Promise<void>((resolve) => {
            socketService.emitListDeleted(listId, listToDelete.name, memberIds, user.name, () => {
              resolve();
            });
            // Timeout fallback - don't hang forever if socket is disconnected
            setTimeout(resolve, 5000);
          });
        }
      }

      await listsApi.deleteList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
    },
    [lists, user],
  );

  const joinGroup = useCallback(
    async (code: string, password: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "userNotLoggedIn" };

      try {
        const joinedList = await listsApi.joinGroup({ inviteCode: code, password });
        setLists((prev) => [...prev, convertApiList(joinedList, locale)]);
        // Join socket room, then notify members after server confirms join
        socketService.joinList(joinedList.id, () => {
          socketService.emitMemberJoined(joinedList.id, joinedList.name, user!.name);
        });
        return { success: true };
      } catch (error: unknown) {
        const apiError = error as { response?: { status?: number; data?: { message?: string; error?: string } }; code?: string };
        const status = apiError.response?.status;
        const errorMessage = apiError.response?.data?.message || apiError.response?.data?.error;

        // Check for network error first
        if (apiError.code === 'ERR_NETWORK') {
          return { success: false, error: 'networkError' };
        }

        // Map specific errors to translation keys
        // Check message content first before falling back to status codes
        if (errorMessage?.toLowerCase().includes('owner')) {
          return { success: false, error: 'youAreOwner' };
        }
        if (status === 404 || errorMessage?.toLowerCase().includes('invalid invite code')) {
          return { success: false, error: 'invalidGroupCode' };
        }
        if (status === 400 || status === 401 || errorMessage?.toLowerCase().includes('invalid password')) {
          return { success: false, error: 'invalidGroupPassword' };
        }
        if (status === 409 || errorMessage?.toLowerCase().includes('already a member')) {
          return { success: false, error: 'alreadyMember' };
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
        // Notify other members and WAIT for server ack before API leave
        // This ensures the notification is broadcast while the user is still a member
        if (listToLeave) {
          await new Promise<void>((resolve) => {
            socketService.emitMemberLeft(listId, listToLeave.name, user.name, () => {
              resolve();
            });
            // Timeout fallback - don't hang forever if socket is disconnected
            setTimeout(resolve, 5000);
          });
        }
        await listsApi.leaveGroup(listId);
        // Leave socket room
        socketService.leaveList(listId);
        setLists((prev) => prev.filter((l) => l.id !== listId));
      } catch (error) {
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

  // Extract list IDs for stable dependency tracking
  const listIds = useMemo(() => lists.map(l => l.id).join(','), [lists]);

  // Refs for debounced list refetching (prevents multiple API calls for same list)
  const pendingRefetchIds = useRef<Set<string>>(new Set());
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to socket events for real-time updates
  useEffect(() => {
    if (!user) return;

    // Parse list IDs from the memoized string
    const currentIds = listIds ? listIds.split(',') : [];

    // Join all list rooms
    currentIds.forEach((id) => socketService.joinList(id));

    // Debounced refetch function - batches multiple refetch requests for same list
    const scheduleRefetch = (listId: string) => {
      pendingRefetchIds.current.add(listId);

      // Clear existing timeout
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }

      // Schedule refetch after 100ms of no new events
      refetchTimeoutRef.current = setTimeout(() => {
        const idsToRefetch = Array.from(pendingRefetchIds.current);
        pendingRefetchIds.current.clear();

        // Refetch each list only once
        idsToRefetch.forEach((id) => {
          listsApi.getList(id).then((updated) => {
            setLists((prev) =>
              prev.map((l) => (l.id === updated.id ? convertApiList(updated, locale) : l)),
            );
          }).catch(() => {
            // Refetch failed - stale data will be shown until next sync
          });
        });
      }, 100);
    };

    // Subscribe to list updates
    const unsubscribeListUpdated = socketService.on('list:updated', (data: unknown) => {
      const listData = data as { listId: string };
      scheduleRefetch(listData.listId);
    });

    // Note: user:joined and user:left socket events are for PRESENCE tracking only
    // (indicating when a user's socket connects/disconnects from the room).
    // They fire on every app open, refresh, or network reconnect - NOT for actual
    // group membership changes. Actual group joins/leaves go through the REST API
    // and are stored as notifications in the database.
    // We intentionally do NOT refetch list data on these events to avoid:
    // 1. Unnecessary API calls on every reconnect
    // 2. Confusing users with activity when someone just reconnects

    // Subscribe to product events - all use debounced refetch
    const unsubscribeProductAdded = socketService.on('product:added', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductUpdated = socketService.on('product:updated', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductDeleted = socketService.on('product:deleted', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    const unsubscribeProductToggled = socketService.on('product:toggled', (data: unknown) => {
      const eventData = data as { listId: string };
      scheduleRefetch(eventData.listId);
    });

    // Subscribe to member change events (join/leave/removed) to update members list
    const unsubscribeNotificationNew = socketService.on('notification:new', (data: unknown) => {
      const eventData = data as { type: string; listId: string; userId: string };
      // Only refetch on member changes, not on other notification types
      if (['join', 'leave', 'removed'].includes(eventData.type)) {
        scheduleRefetch(eventData.listId);
      }
    });

    return () => {
      // Clear pending refetch timeout
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      unsubscribeListUpdated();
      unsubscribeProductAdded();
      unsubscribeProductUpdated();
      unsubscribeProductDeleted();
      unsubscribeProductToggled();
      unsubscribeNotificationNew();
      // Leave all rooms on cleanup (currentIds captured from closure)
      currentIds.forEach((id) => socketService.leaveList(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when user.id or list IDs change
  }, [user?.id, listIds]);

  return {
    lists,
    loading,
    fetchError,
    createList,
    updateList,
    updateListLocal,
    deleteList,
    joinGroup,
    leaveList,
    removeListLocal,
    refetch: fetchLists,
  };
}
