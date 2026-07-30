import { useCallback, useMemo, useRef, useState } from 'react';
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
  const lastClickRef = useRef<{ filter: UserFilter; time: number }>({ filter: 'all', time: 0 });

  // לחיצה על כרטיס סטטיסטיקה = מסנן/מבטל סינון
  // לחיצה כפולה מהירה (תוך 500ms) על אותו כרטיס מתעלמת מהלחיצה השנייה,
  // כדי שדאבל-קליק לא יבטל את הסינון מיד אחרי שנבחר
  const handleFilterClick = useCallback((filter: UserFilter) => {
    const now = Date.now();
    const last = lastClickRef.current;
    lastClickRef.current = { filter, time: now };
    if (last.filter === filter && now - last.time < 500) {
      return;
    }
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
