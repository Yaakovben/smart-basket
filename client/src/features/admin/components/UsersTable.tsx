import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import type { UserWithLastLogin } from '../types';
import type { LoginActivity, Language } from '../../../global/types';
import { UserRow } from './UserRow';

interface UsersTableProps {
  users: UserWithLastLogin[];
  activities: LoginActivity[];
  language: Language;
  onlineUserIds: Set<string>;
  isDark: boolean;
}

export const UsersTable = ({ users, activities, language, onlineUserIds, isDark }: UsersTableProps) => {
  const { t } = useSettings();

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUserIds.has(a.id) ? 1 : 0;
      const bOnline = onlineUserIds.has(b.id) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aTime = a.lastAppOpenAt || a.lastLoginAt || a.createdAt;
      const bTime = b.lastAppOpenAt || b.lastLoginAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [users, onlineUserIds]);

  const activitiesByUser = useMemo(() => {
    const map = new Map<string, LoginActivity[]>();
    for (const activity of activities) {
      const list = map.get(activity.userId);
      if (list) list.push(activity);
      else map.set(activity.userId, [activity]);
    }
    return map;
  }, [activities]);

  if (users.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: '#9CA3AF' }}>
        <Typography sx={{ fontSize: 48, mb: 1, opacity: 0.5 }}>👥</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('noActivityFound')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {sortedUsers.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          language={language}
          isOnline={onlineUserIds.has(user.id)}
          userActivities={activitiesByUser.get(user.id) || []}
          isDark={isDark}
        />
      ))}
    </Box>
  );
};
