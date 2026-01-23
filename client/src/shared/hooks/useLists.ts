import { useState, useEffect, useCallback } from 'react';
import type { List, User, Product } from '../types';
import { generateCode, generatePassword } from '../helpers';

export function useLists(user: User | null) {
  const [lists, setLists] = useState<List[]>(() => {
    const saved = localStorage.getItem('sb_lists');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sb_lists', JSON.stringify(lists));
  }, [lists]);

  // Get user's lists (owned + member of)
  const userLists = lists.filter(
    l => l.owner.id === user?.id || l.members.some(m => m.id === user?.id)
  );

  const myLists = userLists.filter(l => !l.isGroup);
  const groupLists = userLists.filter(l => l.isGroup);

  const createList = useCallback((name: string, icon: string, color: string, isGroup: boolean) => {
    if (!user) return null;

    const newList: List = {
      id: `l${Date.now()}`,
      name,
      icon,
      color,
      isGroup,
      owner: user,
      members: [],
      products: [],
      inviteCode: isGroup ? generateCode() : null,
      password: isGroup ? generatePassword() : null,
      notifications: []
    };

    setLists(prev => [...prev, newList]);
    return newList;
  }, [user]);

  const updateList = useCallback((updatedList: List) => {
    setLists(prev => prev.map(l => l.id === updatedList.id ? updatedList : l));
  }, []);

  const deleteList = useCallback((listId: string) => {
    setLists(prev => prev.filter(l => l.id !== listId));
  }, []);

  const leaveList = useCallback((listId: string) => {
    if (!user) return;
    setLists(prev => prev.map(l => {
      if (l.id === listId) {
        return {
          ...l,
          members: l.members.filter(m => m.id !== user.id),
          notifications: [
            ...(l.notifications || []),
            {
              id: `n${Date.now()}`,
              type: 'leave' as const,
              userId: user.id,
              userName: user.name,
              timestamp: new Date().toISOString(),
              read: false
            }
          ]
        };
      }
      return l;
    }));
  }, [user]);

  const joinGroup = useCallback((code: string, password: string): { success: boolean; error?: string } => {
    if (!user) return { success: false, error: 'לא מחובר' };

    const list = lists.find(l => l.inviteCode === code);
    if (!list) return { success: false, error: 'קוד לא נמצא' };
    if (list.password !== password) return { success: false, error: 'סיסמה שגויה' };
    if (list.owner.id === user.id || list.members.some(m => m.id === user.id)) {
      return { success: false, error: 'כבר חבר בקבוצה' };
    }

    setLists(prev => prev.map(l => {
      if (l.id === list.id) {
        return {
          ...l,
          members: [...l.members, { id: user.id, name: user.name, email: user.email }],
          notifications: [
            ...(l.notifications || []),
            {
              id: `n${Date.now()}`,
              type: 'join' as const,
              userId: user.id,
              userName: user.name,
              timestamp: new Date().toISOString(),
              read: false
            }
          ]
        };
      }
      return l;
    }));

    return { success: true };
  }, [lists, user]);

  const getListById = useCallback((listId: string) => {
    return lists.find(l => l.id === listId);
  }, [lists]);

  const addProduct = useCallback((listId: string, product: Product) => {
    setLists(prev => prev.map(l => {
      if (l.id === listId) {
        return { ...l, products: [...l.products, product] };
      }
      return l;
    }));
  }, []);

  const updateProduct = useCallback((listId: string, product: Product) => {
    setLists(prev => prev.map(l => {
      if (l.id === listId) {
        return {
          ...l,
          products: l.products.map(p => p.id === product.id ? product : p)
        };
      }
      return l;
    }));
  }, []);

  const deleteProduct = useCallback((listId: string, productId: string) => {
    setLists(prev => prev.map(l => {
      if (l.id === listId) {
        return {
          ...l,
          products: l.products.filter(p => p.id !== productId)
        };
      }
      return l;
    }));
  }, []);

  const toggleProduct = useCallback((listId: string, productId: string) => {
    setLists(prev => prev.map(l => {
      if (l.id === listId) {
        return {
          ...l,
          products: l.products.map(p =>
            p.id === productId ? { ...p, isPurchased: !p.isPurchased } : p
          )
        };
      }
      return l;
    }));
  }, []);

  return {
    lists,
    userLists,
    myLists,
    groupLists,
    createList,
    updateList,
    deleteList,
    leaveList,
    joinGroup,
    getListById,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProduct
  };
}
