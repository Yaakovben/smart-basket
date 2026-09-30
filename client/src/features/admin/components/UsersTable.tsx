import { useCallback, useMemo, useState } from 'react';
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
  onUserDeleted: () => void;
  onUserPlanChanged: (userId: string, plan: 'free' | 'pro') => void;
}

export const UsersTable = ({ users, activities, language, onlineUserIds, isDark, onUserDeleted, onUserPlanChanged }: UsersTableProps) => {
  const { t } = useSettings();

  // אילו לקוחות פתוחים. לחיצה רגילה: פותחת את הלקוח וסוגרת את כל השאר, או
  // סוגרת אותו אם כבר היה פתוח. לחיצה כפולה: פותחת בנוסף לפתוחים (או סוגרת
  // רק אותו), בלי לגעת באחרים.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  const handleRowTap = useCallback((userId: string, mode: 'single' | 'multi') => {
    setExpandedIds(prev => {
      if (prev.has(userId)) {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      }
      if (mode === 'single') return new Set([userId]);
      return new Set(prev).add(userId);
    });
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUserIds.has(a.id) ? 1 : 0;
      const bOnline = onlineUserIds.has(b.id) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aTime = Math.max(
        a.lastAppOpenAt ? new Date(a.lastAppOpenAt).getTime() : 0,
        a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0,
        new Date(a.createdAt).getTime(),
      );
      const bTime = Math.max(
        b.lastAppOpenAt ? new Date(b.lastAppOpenAt).getTime() : 0,
        b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0,
        new Date(b.createdAt).getTime(),
      );
      return bTime - aTime;
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
          onUserDeleted={onUserDeleted}
          onUserPlanChanged={onUserPlanChanged}
          isExpanded={expandedIds.has(user.id)}
          onTap={handleRowTap}
        />
      ))}
    </Box>
  );
};
