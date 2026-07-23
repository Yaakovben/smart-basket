import { useCallback, useMemo, useState } from 'react';
import { isActiveToday, isActiveThisMonth } from '../../../global/helpers';
import type { UserFilter, UserWithLastLogin } from '../types';

interface UseAdminUserFilterReturn {
  userSearch: string;
  setUserSearch: (value: string) => void;
  userFilter: UserFilter;
  setUserFilter: (value: UserFilter) => void;
  handleFilterClick: (filter: UserFilter) => void;
  filteredUsers: UserWithLastLogin[];
}

// סינון משתמשים לפי כרטיס סטטיסטיקה לחיץ + חיפוש חופשי בשם/אימייל
export const useAdminUserFilter = (
  usersWithLoginInfo: UserWithLastLogin[],
  onlineUserIds: Set<string>,
): UseAdminUserFilterReturn => {
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');

  // לחיצה על כרטיס סטטיסטיקה = מסנן/מבטל סינון
  const handleFilterClick = useCallback((filter: UserFilter) => {
    setUserFilter(prev => prev === filter ? 'all' : filter);
  }, []);

  const filteredUsers = useMemo(() => {
    let result = usersWithLoginInfo;

    // סינון לפי כרטיס
    if (userFilter === 'online') {
      result = result.filter(u => onlineUserIds.has(u.id));
    } else if (userFilter === 'activeToday' || userFilter === 'loginsToday') {
      result = result.filter(u =>
        isActiveToday(u.lastLoginAt) || isActiveToday(u.lastAppOpenAt)
      );
    } else if (userFilter === 'activeThisMonth') {
      result = result.filter(u =>
        isActiveThisMonth(u.lastLoginAt) || isActiveThisMonth(u.lastAppOpenAt)
      );
    }

    // סינון לפי חיפוש
    if (userSearch) {
      const searchLower = userSearch.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [usersWithLoginInfo, userSearch, userFilter, onlineUserIds]);

  return { userSearch, setUserSearch, userFilter, setUserFilter, handleFilterClick, filteredUsers };
};
