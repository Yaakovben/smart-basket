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

  // לחיצה על כרטיס סטטיסטיקה = תמיד בוחרת את הסינון הזה, אף פעם לא מבטלת -
  // יש כבר כרטיס ייעודי "סה״כ משתמשים" (onSelectAll) שממלא את תפקיד "נקה
  // סינון". קודם זה היה טוגל (לחיצה שנייה על אותו כרטיס = 'all'), מה שגרם
  // ל"לחיצה כפולה מבטלת את הסינון" - תוקן פעם עם debounce לפי תזמון, אבל
  // התיקון האמיתי הוא להסיר את הטוגל לגמרי: אין יותר "לחיצה שנייה שמבטלת",
  // כי כרטיס לא "מבטל" את עצמו בשום תזמון.
  const handleFilterClick = useCallback((filter: UserFilter) => {
    setUserFilter(filter);
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
