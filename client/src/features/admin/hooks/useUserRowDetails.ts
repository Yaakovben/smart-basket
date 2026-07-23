import { useCallback, useState } from 'react';
import { adminApi, type AdminUserList } from '../../../services/api';

interface ListsSummary {
  total: number;
  totalProducts: number;
  groups: number;
}

interface UseUserRowDetailsReturn {
  showDetails: boolean;
  userLists: AdminUserList[] | null;
  detailsLoading: boolean;
  listsSummary: ListsSummary | null;
  handleShowDetails: () => Promise<void>;
}

// טעינת פרטים מורחבים (רשימות) לשורת משתמש - lazy, רק כשלוחצים "פרטים נוספים"
export const useUserRowDetails = (userId: string): UseUserRowDetailsReturn => {
  const [showDetails, setShowDetails] = useState(false);
  const [userLists, setUserLists] = useState<AdminUserList[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleShowDetails = useCallback(async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }
    if (userLists) {
      setShowDetails(true);
      return;
    }
    setDetailsLoading(true);
    setShowDetails(true);
    try {
      const data = await adminApi.getUserDetails(userId);
      setUserLists(data.lists);
    } catch {
      setUserLists([]);
    } finally {
      setDetailsLoading(false);
    }
  }, [showDetails, userLists, userId]);

  const listsSummary: ListsSummary | null = userLists ? {
    total: userLists.length,
    totalProducts: userLists.reduce((sum, l) => sum + l.productCount, 0),
    groups: userLists.filter(l => l.isGroup).length,
  } : null;

  return { showDetails, userLists, detailsLoading, listsSummary, handleShowDetails };
};
